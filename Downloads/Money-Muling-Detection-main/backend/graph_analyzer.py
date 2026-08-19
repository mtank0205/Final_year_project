"""
Graph Analysis Module for Money Mule Detection
Uses NetworkX to detect suspicious transaction patterns
"""
import networkx as nx
import pandas as pd
from io import StringIO
from typing import Dict, List, Set, Any, Tuple
import time


# Trusted accounts whitelist (reduce false positives)
TRUSTED_ACCOUNTS = {
    'AMAZON', 'PAYROLL', 'GOVT_ACCOUNT', 'BANK_FEE', 
    'TAX_AUTHORITY', 'INSURANCE', 'UTILITY_COMPANY'
}


def analyze_transactions(csv_data: bytes) -> Dict[str, Any]:
    """
    Analyze transaction CSV using scalable two-stage pipeline:
    Stage 1: Out-of-core DuckDB behavioral feature extraction & candidate selection.
    Stage 2: Bounded neighborhood graph retrieval (max 1000 nodes) & NetworkX analytics.
    """
    from scalable_analyzer import analyze_transactions_scalable_bytes
    return analyze_transactions_scalable_bytes(csv_data)




def detect_mule_rings(G: nx.DiGraph) -> List[List[str]]:
    """
    Detect money mule rings (circular routing patterns)
    Look for cycles of length 3-5 nodes (capped at 500 rings for safety)
    """
    try:
        mule_rings = []
        for cycle in nx.simple_cycles(G):
            if 3 <= len(cycle) <= 5:
                mule_rings.append(cycle)
                if len(mule_rings) >= 500:
                    break
        return mule_rings
    except:
        return []


def safe_degree(G: nx.DiGraph, node: str) -> int:
    return G.degree[node] if G.has_node(node) else 0

def safe_in_degree(G: nx.DiGraph, node: str) -> int:
    return G.in_degree[node] if G.has_node(node) else 0

def safe_out_degree(G: nx.DiGraph, node: str) -> int:
    return G.out_degree[node] if G.has_node(node) else 0


def detect_smurfing(G: nx.DiGraph) -> List[str]:
    """
    Detect smurfing patterns:
    1. FAN-IN: Many accounts (>=10) send to same receiver
    2. FAN-OUT: One account sends to many receivers (>=10)
    """
    smurfing_accounts = []
    
    for node in G.nodes():
        in_deg = safe_in_degree(G, node)
        out_deg = safe_out_degree(G, node)
        
        # FAN-IN Pattern: 10+ incoming, few outgoing
        if in_deg >= 10 and out_deg <= 2:
            smurfing_accounts.append(node)
        
        # FAN-OUT Pattern: Few incoming, 10+ outgoing
        elif out_deg >= 10 and in_deg <= 2:
            smurfing_accounts.append(node)
    
    return smurfing_accounts


def detect_shell_networks(G: nx.DiGraph) -> List[List[str]]:
    """
    Detect layered mule networks (multi-hop chains with dormant intermediaries)
    """
    layered_chains = []
    
    if G.number_of_nodes() == 0:
        return layered_chains
    
    # Get all nodes sorted by degree
    nodes_by_degree = sorted(G.nodes(), key=lambda n: safe_degree(G, n), reverse=True)
    search_nodes = nodes_by_degree[:min(50, len(nodes_by_degree))]
    
    processed_chains = set()
    
    for source in search_nodes:
        if safe_out_degree(G, source) == 0:
            continue
            
        try:
            for target in G.nodes():
                if source == target:
                    continue
                    
                try:
                    paths = list(nx.all_simple_paths(G, source, target, cutoff=4))
                    
                    for path in paths:
                        if len(path) < 4:
                            continue
                        
                        intermediates = path[1:-1]
                        
                        if all(safe_degree(G, node) <= 3 for node in intermediates):
                            path_tuple = tuple(path)
                            if path_tuple not in processed_chains:
                                layered_chains.append(path)
                                processed_chains.add(path_tuple)
                                
                except (nx.NetworkXNoPath, nx.NodeNotFound):
                    continue
                    
        except Exception:
            continue
    
    return layered_chains


def calculate_risk_score(
    G: nx.DiGraph,
    account: str,
    mule_rings: List[List[str]],
    smurfing_accounts: List[str],
    layered_chains: List[List[str]],
    centrality_scores: Dict[str, float] = None
) -> int:
    """
    Calculate risk score for an account (0-100 scale)
    """
    score = 0
    
    # Check if in mule ring
    if any(account in ring for ring in mule_rings):
        score += 65
    
    # Check if smurfing account
    if account in smurfing_accounts:
        score += 35
    
    # Check if in layered network
    if any(account in chain for chain in layered_chains):
        score += 35
    
    # Check high velocity safely
    if safe_degree(G, account) >= 8:
        score += 20
    
    # Add centrality score (high traffic node)
    if centrality_scores:
        centrality = centrality_scores.get(account, 0)
        score += int(centrality * 20)
    
    # Cap at 100
    return min(score, 100)


def detect_high_velocity(G: nx.DiGraph) -> List[str]:
    """
    Detect high velocity accounts (>=8 transactions)
    """
    high_velocity = []
    
    for node in G.nodes():
        if safe_degree(G, node) >= 8:
            high_velocity.append(node)
    
    return high_velocity


def track_patterns_per_account(
    G: nx.DiGraph,
    mule_rings: List[List[str]],
    smurfing_accounts: List[str],
    layered_chains: List[List[str]],
    high_velocity_accounts: List[str]
) -> Dict[str, List[str]]:
    """
    Track which patterns each account exhibits
    """
    account_patterns = {}
    
    # Track cycle patterns
    for ring in mule_rings:
        cycle_length = len(ring)
        pattern_name = f"cycle_length_{cycle_length}"
        for account in ring:
            if account not in account_patterns:
                account_patterns[account] = []
            if pattern_name not in account_patterns[account]:
                account_patterns[account].append(pattern_name)
    
    # Track smurfing patterns
    for account in smurfing_accounts:
        if account not in account_patterns:
            account_patterns[account] = []
        
        in_deg = safe_in_degree(G, account)
        out_deg = safe_out_degree(G, account)
        
        if in_deg >= 10 and "fan_in" not in account_patterns[account]:
            account_patterns[account].append("fan_in")
        if out_deg >= 10 and "fan_out" not in account_patterns[account]:
            account_patterns[account].append("fan_out")
    
    # Track layered network patterns
    for chain in layered_chains:
        for account in chain:
            if account not in account_patterns:
                account_patterns[account] = []
            if "layered_network" not in account_patterns[account]:
                account_patterns[account].append("layered_network")
    
    # Track high velocity
    for account in high_velocity_accounts:
        if account not in account_patterns:
            account_patterns[account] = []
        if "high_velocity" not in account_patterns[account]:
            account_patterns[account].append("high_velocity")
    
    return account_patterns



def apply_false_positive_controls(
    all_suspicious: Set[str],
    account_patterns: Dict[str, List[str]],
    risk_scores: Dict[str, int],
    G: nx.DiGraph
) -> Set[str]:
    """
    Apply false positive controls to reduce incorrect flagging
    
    Rules:
    1. Mule ring cycles & high-risk multi-patterns are flagged
    2. Require risk >= 60 OR explicit mule cycle participation
    3. Whitelist trusted accounts
    """
    filtered_suspicious = set()
    
    for account in all_suspicious:
        # Skip trusted accounts
        if account in TRUSTED_ACCOUNTS:
            continue
        
        patterns = account_patterns.get(account, [])
        score = risk_scores.get(account, 0)
        
        has_cycle = any("cycle" in p for p in patterns)
        
        # Exception: Cycle ring membership or high risk score (>= 60) or >= 2 patterns
        if has_cycle or score >= 60 or len(patterns) >= 2:
            filtered_suspicious.add(account)
            
    return filtered_suspicious



def generate_fraud_rings(
    mule_rings: List[List[str]],
    smurfing_accounts: List[str],
    layered_chains: List[List[str]],
    suspicious_accounts: Set[str],
    risk_scores: Dict[str, int]
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """
    Generate structured fraud ring objects with unique IDs
    
    Returns:
        - fraud_rings: List of ring objects
        - account_to_ring: Mapping of account_id to ring_id
    
    Ring object format:
    {
        "ring_id": "RING_001",
        "member_accounts": ["ACC_001", "ACC_002", "ACC_003"],
        "pattern_type": "cycle",
        "risk_score": 85.5
    }
    """
    fraud_rings = []
    account_to_ring = {}
    ring_counter = 1
    
    # 1. Generate cycle rings (from mule_rings)
    for ring in mule_rings:
        # Only include if members are in final suspicious_accounts
        flagged_members = [acc for acc in ring if acc in suspicious_accounts]
        
        if len(flagged_members) >= 2:  # Need at least 2 members for a ring
            ring_id = f"RING_{ring_counter:03d}"
            
            # Calculate average risk score for ring
            ring_risk = sum(risk_scores.get(acc, 0) for acc in flagged_members) / len(flagged_members)
            
            fraud_ring = {
                "ring_id": ring_id,
                "member_accounts": flagged_members,
                "pattern_type": "cycle",
                "ring_size": len(flagged_members),
                "risk_score": round(ring_risk, 1)
            }
            
            fraud_rings.append(fraud_ring)
            
            # Map each member to this ring
            for acc in flagged_members:
                account_to_ring[acc] = ring_id
            
            ring_counter += 1
    
    # 2. Generate smurfing rings (fan-in/fan-out groups)
    # Group smurfing accounts that aren't already in cycle rings
    unassigned_smurfing = [acc for acc in smurfing_accounts if acc in suspicious_accounts and acc not in account_to_ring]
    
    for acc in unassigned_smurfing:
        ring_id = f"RING_{ring_counter:03d}"
        
        fraud_ring = {
            "ring_id": ring_id,
            "member_accounts": [acc],  # Smurfing typically individual aggregator
            "pattern_type": "smurfing",
            "ring_size": 1,
            "risk_score": round(risk_scores.get(acc, 0), 1)
        }
        
        fraud_rings.append(fraud_ring)
        account_to_ring[acc] = ring_id
        ring_counter += 1
    
    # 3. Generate layered network rings
    for chain in layered_chains:
        flagged_members = [acc for acc in chain if acc in suspicious_accounts]
        
        # Only create ring if not already assigned and has multiple members
        unassigned_members = [acc for acc in flagged_members if acc not in account_to_ring]
        
        if len(unassigned_members) >= 2:
            ring_id = f"RING_{ring_counter:03d}"
            
            # Calculate average risk score
            ring_risk = sum(risk_scores.get(acc, 0) for acc in unassigned_members) / len(unassigned_members)
            
            fraud_ring = {
                "ring_id": ring_id,
                "member_accounts": unassigned_members,
                "pattern_type": "layered_network",
                "ring_size": len(unassigned_members),
                "risk_score": round(ring_risk, 1)
            }
            
            fraud_rings.append(fraud_ring)
            
            for acc in unassigned_members:
                account_to_ring[acc] = ring_id
            
            ring_counter += 1
    
    # 4. Assign remaining suspicious accounts to individual high-risk rings
    unassigned_accounts = [acc for acc in suspicious_accounts if acc not in account_to_ring]
    
    for acc in unassigned_accounts:
        ring_id = f"RING_{ring_counter:03d}"
        
        fraud_ring = {
            "ring_id": ring_id,
            "member_accounts": [acc],
            "pattern_type": "high_risk_individual",
            "ring_size": 1,
            "risk_score": round(risk_scores.get(acc, 0), 1)
        }
        
        fraud_rings.append(fraud_ring)
        account_to_ring[acc] = ring_id
        ring_counter += 1
    
    return fraud_rings, account_to_ring


def transform_to_required_format(
    suspicious_accounts: Set[str],
    account_patterns: Dict[str, List[str]],
    risk_scores: Dict[str, int],
    account_to_ring: Dict[str, str],
    fraud_rings: List[Dict[str, Any]],
    total_accounts: int,
    total_transactions: int,
    processing_time: float,
    graph_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Transform internal format to required JSON output format
    
    Required format:
    {
      "suspicious_accounts": [
        {
          "account_id": "ACC_001",
          "suspicion_score": 87.5,
          "detected_patterns": ["cycle_length_3", "high_velocity"],
          "ring_id": "RING_001"
        }
      ],
      "fraud_rings": [...],
      "summary": {...}
    }
    """
    # Build suspicious_accounts array with required structure
    suspicious_accounts_list = []
    
    for account in suspicious_accounts:
        account_obj = {
            "account_id": account,
            "suspicion_score": float(risk_scores.get(account, 0)),
            "detected_patterns": account_patterns.get(account, []),
            "ring_id": account_to_ring.get(account, "UNASSIGNED")
        }
        suspicious_accounts_list.append(account_obj)
    
    # Sort by suspicion_score descending
    suspicious_accounts_list.sort(key=lambda x: x["suspicion_score"], reverse=True)
    
    # Build summary object
    summary = {
        "total_accounts_analyzed": total_accounts,
        "total_transactions": total_transactions,
        "suspicious_accounts_flagged": len(suspicious_accounts),
        "fraud_rings_detected": len(fraud_rings),
        "processing_time_seconds": processing_time
    }
    
    # Return in required format
    result = {
        "suspicious_accounts": suspicious_accounts_list,
        "mules": suspicious_accounts_list,
        "fraud_rings": fraud_rings,
        "summary": summary
    }
    if graph_data:
        result["graph"] = graph_data
    return result


def prepare_graph_visualization(
    G: nx.DiGraph, 
    suspicious_accounts: Set[str],
    account_to_ring: Dict[str, str],
    risk_scores: Dict[str, int],
    account_patterns: Dict[str, List[str]]
) -> Dict[str, Any]:
    """
    Prepare graph data for React Flow visualization
    Includes all accounts and their connections with visual metadata
    """
    nodes = []
    edges = []
    
    for node in G.nodes():
        node_type = "normal"
        if node in suspicious_accounts:
            patterns = account_patterns.get(node, [])
            if any("cycle" in p or "layered" in p for p in patterns):
                node_type = "ring"
            else:
                node_type = "mule"
                
        # Calculate total volume for the node
        total_volume = 0
        for u, v, data in G.in_edges(node, data=True):
            total_volume += data.get('amount', 0)
        for u, v, data in G.out_edges(node, data=True):
            total_volume += data.get('amount', 0)
            
        nodes.append({
            "id": node,
            "name": node,
            "type": node_type,
            "riskScore": risk_scores.get(node, 0),
            "flaggedPatterns": account_patterns.get(node, []),
            "totalVolume": total_volume,
            "linkedAccounts": safe_degree(G, node)
        })
        
    for u, v, data in G.edges(data=True):
        # Ring connection is true if both source and target are in the same ring
        ring_u = account_to_ring.get(u)
        ring_v = account_to_ring.get(v)
        is_ring_connection = False
        if ring_u and ring_v and ring_u == ring_v and ring_u != "UNASSIGNED":
            is_ring_connection = True
            
        edges.append({
            "source": u,
            "target": v,
            "value": data.get('amount', 0),
            "isRingConnection": is_ring_connection
        })
        
    return {
        "nodes": nodes,
        "links": edges
    }


def map_columns(columns: List[str]) -> Dict[str, str]:
    mapping = {}
    cols_lower = [c.lower() for c in columns]
    
    # 1. Sender Mapping
    for c in ['sender_id', 'sender', 'from_account', 'from', 'account']:
        if c in cols_lower:
            idx = cols_lower.index(c)
            mapping['sender_id'] = columns[idx]
            break
            
    # Special check for 'account' and 'account.1' (Kaggle dataset specific)
    if 'account' in cols_lower and 'account.1' in cols_lower:
        mapping['sender_id'] = columns[cols_lower.index('account')]
        mapping['receiver_id'] = columns[cols_lower.index('account.1')]
    
    # 2. Receiver Mapping if not set by special check
    if 'receiver_id' not in mapping:
        for c in ['receiver_id', 'receiver', 'to_account', 'to']:
            if c in cols_lower:
                idx = cols_lower.index(c)
                mapping['receiver_id'] = columns[idx]
                break
                
    # 3. Amount Mapping
    for c in ['amount', 'amount paid', 'amount received', 'value', 'amt']:
        if c in cols_lower:
            idx = cols_lower.index(c)
            mapping['amount'] = columns[idx]
            break
            
    # 4. Laundering Mapping
    for c in ['is laundering', 'is_laundering', 'laundering', 'is_mule', 'label']:
        if c in cols_lower:
            idx = cols_lower.index(c)
            mapping['is_laundering'] = columns[idx]
            break
            
    return mapping


def analyze_large_local_csv(
    file_path: str,
    sample_limit: int = 100000,
    downsample_rate: float = 0.001,
    only_laundering: bool = True
) -> Tuple[Dict[str, Any], nx.DiGraph]:
    """
    Read large CSV in chunks using DuckDB out-of-core Stage 1 feature extraction
    and Stage 2 bounded neighborhood graph analysis (max 1000 nodes).
    Prevents memory overflow on large multi-gigabyte datasets.
    """
    from scalable_analyzer import analyze_transactions_scalable
    return analyze_transactions_scalable(file_path=file_path)



def prepare_capped_graph_visualization(
    G: nx.DiGraph, 
    suspicious_accounts: Set[str],
    account_to_ring: Dict[str, str],
    risk_scores: Dict[str, int],
    account_patterns: Dict[str, List[str]],
    max_nodes: int = 1000
) -> Dict[str, Any]:
    """
    Extract a relevant neighborhood subgraph centered around suspicious nodes.
    Capped at max_nodes to prevent rendering freeze on frontend.
    """
    suspicious_list = list(suspicious_accounts)
    
    visual_nodes = set(suspicious_list[:min(len(suspicious_list), max_nodes)])
    
    if len(visual_nodes) < max_nodes:
        for node in suspicious_list:
            if len(visual_nodes) >= max_nodes:
                break
            for neighbor in list(G.successors(node)) + list(G.predecessors(node)):
                visual_nodes.add(neighbor)
                if len(visual_nodes) >= max_nodes:
                    break
                    
    subG = G.subgraph(visual_nodes)
    
    nodes = []
    edges = []
    
    for node in subG.nodes():
        node_type = "normal"
        if node in suspicious_accounts:
            patterns = account_patterns.get(node, [])
            if any("cycle" in p or "layered" in p for p in patterns):
                node_type = "ring"
            else:
                node_type = "mule"
                
        total_volume = 0
        for u, v, data in subG.in_edges(node, data=True):
            total_volume += data.get('amount', 0)
        for u, v, data in subG.out_edges(node, data=True):
            total_volume += data.get('amount', 0)
            
        nodes.append({
            "id": node,
            "name": node,
            "type": node_type,
            "riskScore": risk_scores.get(node, 0),
            "flaggedPatterns": account_patterns.get(node, []),
            "totalVolume": total_volume,
            "linkedAccounts": safe_degree(subG, node)
        })
        
    for u, v, data in subG.edges(data=True):
        ring_u = account_to_ring.get(u)
        ring_v = account_to_ring.get(v)
        is_ring_connection = False
        if ring_u and ring_v and ring_u == ring_v and ring_u != "UNASSIGNED":
            is_ring_connection = True
            
        edges.append({
            "source": u,
            "target": v,
            "value": data.get('amount', 0),
            "isRingConnection": is_ring_connection
        })
        
    return {
        "nodes": nodes,
        "links": edges
    }
