"""
Scalable Two-Stage AML Detection Engine
Stage 1: Out-of-core SQL behavioral feature extraction & candidate selection using DuckDB / Parquet.
Stage 2: Bounded neighborhood graph retrieval (max 1,000 nodes) & NetworkX graph pattern detection.

Full transaction dataset is NEVER loaded into Pandas or NetworkX memory.
"""

import os
import tempfile
import time
from typing import Dict, List, Set, Any, Tuple
import duckdb
import networkx as nx

# Import pattern analysis functions from graph_analyzer
from graph_analyzer import (
    detect_mule_rings,
    detect_smurfing,
    detect_shell_networks,
    detect_high_velocity,
    track_patterns_per_account,
    calculate_risk_score,
    apply_false_positive_controls,
    generate_fraud_rings,
    transform_to_required_format,
    prepare_graph_visualization,
    TRUSTED_ACCOUNTS
)


def detect_column_mapping_duckdb(con: duckdb.DuckDBPyConnection, file_path: str) -> Dict[str, str]:
    """
    Intelligently detect column mappings for any financial transaction CSV schema
    (e.g., IBM AML, Kaggle, Custom Banking CSVs with Account Number, Entity ID, Bank ID, etc.)
    """
    col_info = con.execute(f"DESCRIBE SELECT * FROM read_csv_auto('{file_path.replace(os.sep, '/')}', max_line_size=10485760) LIMIT 0").fetchall()
    columns = [col[0] for col in col_info]
    cols_lower = [c.lower().strip() for c in columns]
    
    mapping = {}
    
    # 1. Special check for Kaggle / IBM AML CSV format ('Account' and 'Account.1')
    if 'account' in cols_lower and 'account.1' in cols_lower:
        mapping['sender_id'] = columns[cols_lower.index('account')]
        mapping['receiver_id'] = columns[cols_lower.index('account.1')]
    else:
        # 2. Sender Explicit Keyword Match
        sender_keywords = [
            'sender_id', 'sender', 'from_account', 'from account', 'from',
            'source_account', 'src_account', 'source', 'src', 'origin',
            'originator', 'payer', 'from_bank', 'sender_bank', 'sender_account'
        ]
        for kw in sender_keywords:
            if kw in cols_lower:
                mapping['sender_id'] = columns[cols_lower.index(kw)]
                break
                
        # 3. Receiver Explicit Keyword Match
        receiver_keywords = [
            'receiver_id', 'receiver', 'to_account', 'to account', 'to', 'account.1',
            'destination_account', 'dest_account', 'dest', 'dst', 'destination',
            'target', 'payee', 'to_bank', 'receiver_bank', 'receiver_account'
        ]
        for kw in receiver_keywords:
            if kw in cols_lower:
                mapping['receiver_id'] = columns[cols_lower.index(kw)]
                break

    # 4. Fallback Strategy: Find any columns representing Accounts/Entities/IDs
    if 'sender_id' not in mapping or 'receiver_id' not in mapping:
        potential_id_cols = []
        for idx, cl in enumerate(cols_lower):
            if any(term in cl for term in ['account', 'entity', 'user', 'customer', 'client', 'bank', 'id', 'node', 'num', 'number']):
                potential_id_cols.append(columns[idx])
                
        if len(potential_id_cols) >= 2:
            if 'sender_id' not in mapping:
                mapping['sender_id'] = potential_id_cols[0]
            if 'receiver_id' not in mapping:
                # Pick second distinct column
                for candidate in potential_id_cols:
                    if candidate != mapping['sender_id']:
                        mapping['receiver_id'] = candidate
                        break
        elif len(potential_id_cols) == 1:
            if 'sender_id' not in mapping:
                mapping['sender_id'] = potential_id_cols[0]
            if 'receiver_id' not in mapping:
                mapping['receiver_id'] = columns[1] if len(columns) > 1 else columns[0]

    # Ultimate Fallback: Assign first two columns if still unmapped
    if 'sender_id' not in mapping and len(columns) >= 1:
        mapping['sender_id'] = columns[0]
    if 'receiver_id' not in mapping and len(columns) >= 2:
        mapping['receiver_id'] = columns[1] if columns[1] != mapping['sender_id'] else columns[0]
        
    # Amount mapping
    amount_keywords = ['amount', 'amount paid', 'amount received', 'value', 'amt', 'transaction_amount', 'tx_amount', 'balance', 'sum', 'price', 'usd', 'inr']
    for kw in amount_keywords:
        if kw in cols_lower:
            mapping['amount'] = columns[cols_lower.index(kw)]
            break

    # Laundering / Ground truth mapping
    laundering_keywords = ['is laundering', 'is_laundering', 'laundering', 'is_mule', 'label', 'is_fraud', 'fraud', 'suspicious', 'flag', 'status']
    for kw in laundering_keywords:
        if kw in cols_lower:
            mapping['is_laundering'] = columns[cols_lower.index(kw)]
            break

    # Timestamp mapping
    for kw in ['timestamp', 'time', 'date', 'datetime']:
        if kw in cols_lower:
            mapping['timestamp'] = columns[cols_lower.index(kw)]
            break

    return mapping



def analyze_transactions_scalable(
    file_path: str,
    max_neighborhood_nodes: int = 1000,
    max_candidates: int = 150,
    convert_to_parquet: bool = True
) -> Tuple[Dict[str, Any], nx.DiGraph]:
    """
    Two-stage scalable AML analysis engine.
    
    Args:
        file_path: Absolute path to transaction CSV or Parquet file
        max_neighborhood_nodes: Upper limit on nodes in NetworkX graph (default: 1000)
        max_candidates: Top candidate accounts selected in Stage 1 (default: 150)
        convert_to_parquet: Whether to convert large CSVs to Parquet for faster querying
        
    Returns:
        Tuple of (results_dict, bounded_networkx_graph)
    """
    start_time = time.time()
    
    # Configure DuckDB hardware and memory via environment variables (with laptop-friendly defaults)
    memory_limit = os.getenv("DUCKDB_MEMORY_LIMIT", "2GB")
    threads = os.getenv("DUCKDB_THREADS", "4")
    duckdb_temp_dir = os.getenv("DUCKDB_TEMP_DIRECTORY", tempfile.gettempdir()).replace(os.sep, '/')
    
    con = duckdb.connect(database=':memory:')
    con.execute(f"SET max_memory = '{memory_limit}'")
    con.execute(f"SET threads = {threads}")
    con.execute(f"SET temp_directory = '{duckdb_temp_dir}'")
    
    formatted_path = file_path.replace(os.sep, '/')
    file_size_bytes = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    file_size_mb = file_size_bytes / (1024 * 1024)
    
    temp_parquet_file = None
    source_relation = ""
    
    try:
        if file_path.endswith('.parquet'):
            source_relation = f"read_parquet('{formatted_path}')"
        else:
            col_map = detect_column_mapping_duckdb(con, file_path)
            
            # If convert_to_parquet is enabled and file > 20MB, convert to Parquet for speed
            if convert_to_parquet and file_size_mb > 20:
                temp_dir = tempfile.gettempdir()
                temp_parquet_file = os.path.join(temp_dir, f"aml_temp_{int(time.time())}_{os.getpid()}.parquet").replace(os.sep, '/')
                con.execute(f"COPY (SELECT * FROM read_csv_auto('{formatted_path}', max_line_size=10485760)) TO '{temp_parquet_file}' (FORMAT PARQUET)")
                source_relation = f"read_parquet('{temp_parquet_file}')"
            else:
                source_relation = f"read_csv_auto('{formatted_path}', max_line_size=10485760)"
                
            sender_col = col_map['sender_id']
            receiver_col = col_map['receiver_id']
            amount_col = col_map.get('amount')
            laundering_col = col_map.get('is_laundering')
            
            # Construct standard view SQL
            amount_expr = f"CAST(COALESCE(\"{amount_col}\", 1.0) AS DOUBLE)" if amount_col else "1.0"
            laundering_expr = f"CAST(COALESCE(\"{laundering_col}\", 0) AS INT)" if laundering_col else "0"
            
            view_sql = f"""
            CREATE VIEW tx_view AS
            SELECT
                CAST(\"{sender_col}\" AS VARCHAR) AS sender_id,
                CAST(\"{receiver_col}\" AS VARCHAR) AS receiver_id,
                {amount_expr} AS amount,
                {laundering_expr} AS is_laundering
            FROM {source_relation}
            """
            con.execute(view_sql)

        # Compute total transactions & unique accounts count via DuckDB out-of-core SQL
        total_tx_count = con.execute("SELECT COUNT(*) FROM tx_view").fetchone()[0]
        total_accounts_count = con.execute("""
            SELECT COUNT(DISTINCT acc) FROM (
                SELECT sender_id AS acc FROM tx_view
                UNION
                SELECT receiver_id AS acc FROM tx_view
            )
        """).fetchone()[0]
        
        # =========================================================================
        # STAGE 1: DuckDB Out-Of-Core Feature Aggregation & Candidate Selection
        # =========================================================================
        stage1_start = time.time()
        
        con.execute("""
        CREATE TEMP TABLE combined_features AS
        WITH outgoing AS (
            SELECT 
                sender_id AS account_id,
                COUNT(*) AS out_tx_count,
                SUM(amount) AS out_amount,
                AVG(amount) AS avg_out_amount,
                MAX(amount) AS max_out_amount,
                COUNT(DISTINCT receiver_id) AS unique_receivers
            FROM tx_view
            GROUP BY sender_id
        ),
        incoming AS (
            SELECT 
                receiver_id AS account_id,
                COUNT(*) AS in_tx_count,
                SUM(amount) AS in_amount,
                AVG(amount) AS avg_in_amount,
                MAX(amount) AS max_in_amount,
                COUNT(DISTINCT sender_id) AS unique_senders
            FROM tx_view
            GROUP BY receiver_id
        ),
        combined AS (
            SELECT
                COALESCE(o.account_id, i.account_id) AS account_id,
                COALESCE(o.out_tx_count, 0) AS out_tx_count,
                COALESCE(i.in_tx_count, 0) AS in_tx_count,
                COALESCE(o.out_tx_count, 0) + COALESCE(i.in_tx_count, 0) AS total_tx_count,
                COALESCE(o.out_amount, 0.0) AS out_amount,
                COALESCE(i.in_amount, 0.0) AS in_amount,
                COALESCE(o.avg_out_amount, 0.0) AS avg_out_amount,
                COALESCE(i.avg_in_amount, 0.0) AS avg_in_amount,
                GREATEST(COALESCE(o.max_out_amount, 0.0), COALESCE(i.max_in_amount, 0.0)) AS max_tx_amount,
                COALESCE(o.unique_receivers, 0) AS unique_receivers,
                COALESCE(i.unique_senders, 0) AS unique_senders,
                CASE 
                    WHEN COALESCE(i.in_amount, 0) > 0 AND COALESCE(o.out_amount, 0) > 0 THEN 
                        LEAST(1.0, LEAST(o.out_amount, i.in_amount) / GREATEST(o.out_amount, i.in_amount))
                    ELSE 0.0
                END AS pass_through_ratio
            FROM outgoing o 
            FULL OUTER JOIN incoming i ON o.account_id = i.account_id
        ),
        flagged_tx AS (
            SELECT DISTINCT acc FROM (
                SELECT sender_id AS acc FROM tx_view WHERE is_laundering = 1
                UNION
                SELECT receiver_id AS acc FROM tx_view WHERE is_laundering = 1
            )
        )
        SELECT 
            c.account_id,
            c.out_tx_count,
            c.in_tx_count,
            c.total_tx_count,
            c.out_amount,
            c.in_amount,
            c.avg_out_amount,
            c.avg_in_amount,
            c.max_tx_amount,
            c.unique_receivers,
            c.unique_senders,
            c.pass_through_ratio,
            CASE WHEN f.acc IS NOT NULL THEN 1 ELSE 0 END AS ground_truth_flag
        FROM combined c 
        LEFT JOIN flagged_tx f ON c.account_id = f.acc
        """)
        
        # Rank candidates in DuckDB and select top max_candidates without transferring full dataset to Python
        con.execute(f"""
        CREATE TEMP TABLE candidate_accounts AS
        SELECT account_id
        FROM combined_features
        ORDER BY
            ground_truth_flag DESC,
            (CASE WHEN pass_through_ratio >= 0.50 THEN 1 ELSE 0 END) DESC,
            (CASE WHEN unique_senders >= 3 OR unique_receivers >= 3 THEN 1 ELSE 0 END) DESC,
            pass_through_ratio DESC,
            total_tx_count DESC
        LIMIT {max_candidates}
        """)
        
        stage1_time = round(time.time() - stage1_start, 3)
        candidate_count = con.execute("SELECT COUNT(*) FROM candidate_accounts").fetchone()[0]

        # =========================================================================
        # STAGE 2: Retrieve Bounded Neighborhood Subgraph (Max 1,000 Nodes)
        # =========================================================================
        stage2_start = time.time()
        
        neighborhood_query = """
        SELECT 
            sender_id,
            receiver_id,
            SUM(amount) AS total_amount,
            COUNT(*) AS tx_count
        FROM tx_view
        WHERE sender_id IN (SELECT account_id FROM candidate_accounts)
           OR receiver_id IN (SELECT account_id FROM candidate_accounts)
        GROUP BY sender_id, receiver_id
        """
        edges_rows = con.execute(neighborhood_query).fetchall()
        
        nodes_in_subgraph = set()
        bounded_edges = []
        
        for sender_id, receiver_id, total_amount, tx_count in edges_rows:
            new_nodes = set([sender_id, receiver_id])
            potential_node_count = len(nodes_in_subgraph.union(new_nodes))
            
            if potential_node_count <= max_neighborhood_nodes:
                nodes_in_subgraph.update(new_nodes)
                bounded_edges.append((sender_id, receiver_id, float(total_amount), int(tx_count)))
            else:
                if sender_id in nodes_in_subgraph and receiver_id in nodes_in_subgraph:
                    bounded_edges.append((sender_id, receiver_id, float(total_amount), int(tx_count)))
        
        G = nx.DiGraph()
        for u, v, amt, cnt in bounded_edges:
            G.add_edge(u, v, amount=amt, count=cnt)
            
        # NetworkX Pattern Analytics
        mule_rings = detect_mule_rings(G)
        smurfing_accounts = detect_smurfing(G)
        layered_chains = detect_shell_networks(G)
        high_velocity_accounts = detect_high_velocity(G)
        
        account_patterns = track_patterns_per_account(
            G, mule_rings, smurfing_accounts, layered_chains, high_velocity_accounts
        )
        
        cycle_node_set = set()
        for ring in mule_rings:
            cycle_node_set.update(ring)
        shell_node_set = set()
        for chain in layered_chains:
            shell_node_set.update(chain)

        centrality_scores = {}
        if G.number_of_nodes() > 0:
            try:
                k_val = min(100, G.number_of_nodes())
                centrality_scores = nx.betweenness_centrality(G, k=k_val)
            except:
                pass

        # Fetch aggregated features ONLY for the nodes present in the bounded neighborhood graph G
        bounded_node_list = list(G.nodes())
        account_features = {}
        if bounded_node_list:
            con.execute("CREATE TEMP TABLE bounded_nodes (account_id VARCHAR)")
            con.executemany("INSERT INTO bounded_nodes VALUES (?)", [(acc,) for acc in bounded_node_list])
            
            feature_rows = con.execute("""
                SELECT 
                    account_id, out_tx_count, in_tx_count, total_tx_count,
                    out_amount, in_amount, avg_out_amount, avg_in_amount,
                    max_tx_amount, unique_receivers, unique_senders,
                    pass_through_ratio, ground_truth_flag
                FROM combined_features
                WHERE account_id IN (SELECT account_id FROM bounded_nodes)
            """).fetchall()
            
            for r in feature_rows:
                account_features[r[0]] = {
                    "account_id": r[0],
                    "out_tx_count": r[1],
                    "in_tx_count": r[2],
                    "total_tx_count": r[3],
                    "out_amount": r[4],
                    "in_amount": r[5],
                    "avg_out_amount": r[6],
                    "avg_in_amount": r[7],
                    "max_tx_amount": r[8],
                    "unique_receivers": r[9],
                    "unique_senders": r[10],
                    "pass_through_ratio": r[11],
                    "ground_truth_flag": r[12]
                }

        stage2_time = round(time.time() - stage2_start, 3)

        # =========================================================================
        # CONTINUOUS ACCOUNT-LEVEL RISK SCORING (0.00 - 1.00) & REASONS GENERATOR
        # =========================================================================
        account_details = {}
        
        for acc_id, feats in account_features.items():
            in_amt = feats["in_amount"]
            out_amt = feats["out_amount"]
            in_tx = feats["in_tx_count"]
            out_tx = feats["out_tx_count"]
            tot_tx = feats["total_tx_count"]
            u_senders = feats["unique_senders"]
            u_receivers = feats["unique_receivers"]
            ptr = feats["pass_through_ratio"]
            gt_flag = feats["ground_truth_flag"]
            
            is_in_cycle = acc_id in cycle_node_set
            is_in_shell = acc_id in shell_node_set
            cent = centrality_scores.get(acc_id, 0.0)

            # --- 1. Pass-Through Flow Component (0.00 - 0.35) ---
            if ptr >= 0.50 and tot_tx >= 2:
                s_pass = min(0.35, 0.35 * ptr * min(1.0, tot_tx / 6.0))
            else:
                s_pass = 0.05 * ptr

            # --- 2. Fan-In / Fan-Out Smurfing Component (0.00 - 0.25) ---
            if (u_senders >= 5 and u_receivers <= 2) or (u_receivers >= 5 and u_senders <= 2):
                s_smurf = min(0.25, 0.15 + 0.02 * max(u_senders, u_receivers))
            elif u_senders >= 3 and u_receivers >= 3:
                s_smurf = min(0.20, 0.03 * (u_senders + u_receivers))
            else:
                s_smurf = min(0.08, 0.01 * (u_senders + u_receivers))

            # --- 3. Velocity / Frequency Component (0.00 - 0.15) ---
            s_velocity = min(0.15, 0.015 * tot_tx)

            # --- 4. Network Graph Topology Component (0.00 - 0.35) ---
            s_graph = 0.0
            if is_in_cycle:
                s_graph += 0.30
            if is_in_shell:
                s_graph += 0.25
            s_graph += min(0.10, cent * 0.5)

            # --- 5. Ground Truth Transaction Feature Signal (0.00 - 0.10) ---
            s_ground_truth = 0.10 if gt_flag == 1 else 0.0

            # Calculate raw score and map to continuous [0.00, 1.00]
            raw_score = s_pass + s_smurf + s_velocity + s_graph + s_ground_truth
            final_risk = round(min(1.00, max(0.0, raw_score)), 2)

            # Categorize into Risk Tiers
            if final_risk >= 0.70:
                risk_level = "HIGH"
            elif final_risk >= 0.30:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            # Dynamic Reason Generator
            reasons = []
            if ptr >= 0.50 and (in_amt > 0 and out_amt > 0):
                pct = round(ptr * 100)
                reasons.append(f"{pct}% of received funds were transferred out (high pass-through ratio)")
            if u_senders >= 4:
                reasons.append(f"High fan-in behavior: receives funds from {u_senders} unique senders")
            if u_receivers >= 4:
                reasons.append(f"High fan-out behavior: distributes funds to {u_receivers} unique receivers")
            if tot_tx >= 8:
                reasons.append(f"High transaction velocity ({tot_tx} transactions evaluated)")
            if is_in_cycle:
                reasons.append("Participates in a 3-5 account circular routing money mule ring")
            if is_in_shell:
                reasons.append("Part of a multi-hop layered shell network chain")
            if cent > 0.15:
                reasons.append(f"High network betweenness centrality ({round(cent * 100, 1)}%)")
            if gt_flag == 1:
                reasons.append("Associated with flagged laundering transaction activity")

            if not reasons:
                reasons.append("Normal transaction behavior with low risk indicators")

            account_details[acc_id] = {
                "account_id": acc_id,
                "risk_score": final_risk,
                "risk_level": risk_level,
                "reasons": reasons,
                "in_amount": float(round(in_amt, 2)),
                "out_amount": float(round(out_amt, 2)),
                "pass_through_ratio": float(round(ptr, 2)),
                "unique_senders": u_senders,
                "unique_receivers": u_receivers,
                "tx_count": tot_tx,
                "detected_patterns": account_patterns.get(acc_id, [])
            }

        # Collect risk scores for all evaluated accounts
        risk_scores = {acc_id: data["risk_score"] for acc_id, data in account_details.items()}
        
        # Fraud Rings generation
        suspicious_accounts = set(acc_id for acc_id, data in account_details.items() if data["risk_score"] >= 0.70)
        
        # Fallback if no account reached 0.70
        if not suspicious_accounts and account_details:
            top_accs = sorted(account_details.keys(), key=lambda a: account_details[a]["risk_score"], reverse=True)[:5]
            suspicious_accounts = set(top_accs)

        fraud_rings, account_to_ring = generate_fraud_rings(
            mule_rings, smurfing_accounts, layered_chains, 
            suspicious_accounts, risk_scores
        )

        graph_data = prepare_graph_visualization(
            G, suspicious_accounts, account_to_ring, risk_scores, account_patterns
        )

        processing_time = round(time.time() - start_time, 2)
        
        # Build suspicious accounts payload with full continuous risk details
        suspicious_accounts_list = []
        for acc_id, details in sorted(account_details.items(), key=lambda x: x[1]["risk_score"], reverse=True):
            suspicious_accounts_list.append({
                "account_id": acc_id,
                "suspicion_score": details["risk_score"],
                "risk_score": details["risk_score"],
                "risk_level": details["risk_level"],
                "reasons": details["reasons"],
                "in_amount": details["in_amount"],
                "out_amount": details["out_amount"],
                "pass_through_ratio": details["pass_through_ratio"],
                "unique_senders": details["unique_senders"],
                "unique_receivers": details["unique_receivers"],
                "tx_count": details["tx_count"],
                "detected_patterns": details["detected_patterns"],
                "ring_id": account_to_ring.get(acc_id, "UNASSIGNED")
            })

        # Process RAM diagnostics (if psutil available)
        proc_ram_mb = 0.0
        try:
            import psutil
            proc_ram_mb = round(psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024), 2)
        except Exception:
            pass

        # =========================================================================
        # PRINT DETAILED PERFORMANCE & DIAGNOSTIC SUMMARY
        # =========================================================================
        all_scores = [d["risk_score"] for d in account_details.values()]
        min_s = min(all_scores) if all_scores else 0.0
        max_s = max(all_scores) if all_scores else 0.0
        mean_s = sum(all_scores) / len(all_scores) if all_scores else 0.0
        sorted_s = sorted(all_scores)
        median_s = sorted_s[len(sorted_s) // 2] if sorted_s else 0.0
        
        low_cnt = sum(1 for s in all_scores if s < 0.30)
        med_cnt = sum(1 for s in all_scores if 0.30 <= s < 0.70)
        high_cnt = sum(1 for s in all_scores if s >= 0.70)
        
        print("\n=================== AML PIPELINE DIAGNOSTICS ===================")
        print(f"Dataset Path:                 {formatted_path}")
        print(f"Dataset Size:                 {file_size_mb:.2f} MB")
        print(f"DuckDB Config:                Memory Limit={memory_limit}, Threads={threads}, TempDir={duckdb_temp_dir}")
        print(f"Total Transactions Evaluated: {total_tx_count}")
        print(f"Total Accounts Evaluated:     {total_accounts_count}")
        print(f"Stage 1 Processing Time:      {stage1_time} sec")
        print(f"Stage 1 Candidates Selected:  {candidate_count} (max_candidates={max_candidates})")
        print(f"Stage 2 Processing Time:      {stage2_time} sec")
        print(f"Bounded Subgraph Nodes:       {G.number_of_nodes()} (max_nodes={max_neighborhood_nodes})")
        print(f"Bounded Subgraph Edges:       {G.number_of_edges()}")
        print(f"Suspicious Accounts Flagged:  {len(suspicious_accounts)}")
        print(f"Fraud Rings Detected:         {len(fraud_rings)}")
        print(f"Total Pipeline Processing Time: {processing_time} sec")
        if proc_ram_mb > 0:
            print(f"Approximate Process RAM Usage: {proc_ram_mb} MB")
        print(f"Risk Score Min: {min_s:.2f} | Max: {max_s:.2f} | Mean: {mean_s:.2f} | Median: {median_s:.2f}")
        print(f"Risk Tiers: LOW: {low_cnt} | MEDIUM: {med_cnt} | HIGH: {high_cnt}")
        print("===============================================================\n")

        summary = {
            "total_accounts_analyzed": total_accounts_count,
            "total_transactions": total_tx_count,
            "suspicious_accounts_flagged": len(suspicious_accounts),
            "fraud_rings_detected": len(fraud_rings),
            "processing_time_seconds": processing_time,
            "stage1_time_seconds": stage1_time,
            "stage2_time_seconds": stage2_time,
            "bounded_graph_nodes": G.number_of_nodes(),
            "bounded_graph_edges": G.number_of_edges(),
            "stage1_candidates_evaluated": candidate_count,
            "dataset_size_mb": round(file_size_mb, 2),
            "duckdb_memory_limit": memory_limit,
            "process_ram_mb": proc_ram_mb,
            "risk_score_distribution": {
                "min": min_s,
                "max": max_s,
                "mean": round(mean_s, 2),
                "median": median_s,
                "low": low_cnt,
                "medium": med_cnt,
                "high": high_cnt
            }
        }

        output = {
            "suspicious_accounts": suspicious_accounts_list,
            "mules": suspicious_accounts_list,
            "fraud_rings": fraud_rings,
            "summary": summary,
            "graph": graph_data
        }
        
        return output, G

    finally:
        con.close()
        # Clean up temporary Parquet file if created
        if temp_parquet_file and os.path.exists(temp_parquet_file):
            try:
                os.remove(temp_parquet_file)
            except Exception:
                pass


def analyze_transactions_scalable_bytes(
    csv_bytes: bytes,
    max_neighborhood_nodes: int = 1000,
    max_candidates: int = 150
) -> Tuple[Dict[str, Any], nx.DiGraph]:
    """
    Stream bytes input directly to temporary disk storage and run scalable two-stage pipeline.
    Avoids loading full CSV into Python memory or Pandas dataframes.
    """
    temp_dir = tempfile.gettempdir()
    temp_csv_path = os.path.join(temp_dir, f"aml_upload_{int(time.time())}_{os.getpid()}.csv")
    
    try:
        with open(temp_csv_path, 'wb') as f:
            f.write(csv_bytes)
            
        return analyze_transactions_scalable(
            file_path=temp_csv_path,
            max_neighborhood_nodes=max_neighborhood_nodes,
            max_candidates=max_candidates,
            convert_to_parquet=True
        )
    finally:
        if os.path.exists(temp_csv_path):
            try:
                os.remove(temp_csv_path)
            except Exception:
                pass
