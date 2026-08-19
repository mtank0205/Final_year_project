"""
Large Dataset Benchmark & Verification Script
Generates a large synthetic CSV (500,000+ transactions, 100,000+ accounts)
and tests the out-of-core DuckDB pipeline for bounded memory usage and detection quality.
"""

import os
import sys
import tempfile
import time
import random

def run_large_dataset_test():
    print("=================================================================")
    print("      AML BACKEND LARGE DATASET BENCHMARK & MEMORY TEST          ")
    print("=================================================================")
    
    from scalable_analyzer import analyze_transactions_scalable
    
    temp_dir = tempfile.gettempdir()
    large_csv_path = os.path.join(temp_dir, "synthetic_large_aml_test.csv")
    
    print("\n[1/3] Generating synthetic large transaction dataset...")
    start_gen = time.time()
    
    num_normal_txs = 500000  # 500k rows
    num_accounts = 100000
    
    with open(large_csv_path, "w", encoding="utf-8") as f:
        f.write("sender_id,receiver_id,amount,is_laundering\n")
        
        # 1. Inject a multi-node money laundering ring (Cycle: MULE_R1 -> MULE_R2 -> MULE_R3 -> MULE_R1)
        f.write("MULE_RING_1,MULE_RING_2,250000.0,1\n")
        f.write("MULE_RING_2,MULE_RING_3,248000.0,1\n")
        f.write("MULE_RING_3,MULE_RING_1,245000.0,1\n")
        
        # 2. Inject Smurfing fan-in pattern (15 senders -> MULE_SMURF_HUB -> MULE_CASH_DEST)
        for i in range(1, 16):
            f.write(f"SMURF_SRC_{i},MULE_SMURF_HUB,9500.0,0\n")
        f.write("MULE_SMURF_HUB,MULE_CASH_DEST,140000.0,0\n")
        
        # 3. Inject 500,000 normal transactions across 100,000 accounts
        for idx in range(num_normal_txs):
            s_id = f"ACC_{random.randint(1, num_accounts)}"
            r_id = f"ACC_{random.randint(1, num_accounts)}"
            amt = round(random.uniform(10.0, 5000.0), 2)
            f.write(f"{s_id},{r_id},{amt},0\n")
            
    gen_time = round(time.time() - start_gen, 2)
    file_size_mb = round(os.path.getsize(large_csv_path) / (1024 * 1024), 2)
    print(f"  [+] Generated {num_normal_txs + 18:,} transactions ({file_size_mb} MB) in {gen_time} sec")
    
    print("\n[2/3] Executing Out-Of-Core DuckDB AML Pipeline...")
    try:
        results, G = analyze_transactions_scalable(
            file_path=large_csv_path,
            max_neighborhood_nodes=1000,
            max_candidates=150
        )
        
        summary = results.get("summary", {})
        suspicious = results.get("suspicious_accounts", [])
        fraud_rings = results.get("fraud_rings", [])
        
        print("\n[3/3] Verifying Assertions & Detection Quality...")
        print(f"  • Total Transactions Analyzed: {summary.get('total_transactions'):,}")
        print(f"  • Total Unique Accounts:       {summary.get('total_accounts_analyzed'):,}")
        print(f"  • Stage 1 Candidates Evaluated: {summary.get('stage1_candidates_evaluated')}")
        print(f"  • Bounded Subgraph Nodes:      {summary.get('bounded_graph_nodes')} (Cap: <= 1000)")
        print(f"  • Bounded Subgraph Edges:      {summary.get('bounded_graph_edges')}")
        print(f"  • Flagged Suspicious Accounts: {len(suspicious)}")
        print(f"  • Detected Fraud Rings:         {len(fraud_rings)}")
        print(f"  • Stage 1 Time:                {summary.get('stage1_time_seconds')} sec")
        print(f"  • Stage 2 Time:                {summary.get('stage2_time_seconds')} sec")
        print(f"  • Total Processing Time:       {summary.get('processing_time_seconds')} sec")
        print(f"  • Process RAM Usage:           {summary.get('process_ram_mb')} MB")
        
        # Assertions
        assert summary.get('bounded_graph_nodes') <= 1000, "Bounded graph node cap violated!"
        assert len(suspicious) > 0, "No suspicious accounts flagged!"
        
        flagged_ids = [acc["account_id"] for acc in suspicious]
        print("\nTop Flagged Suspicious Accounts:")
        for acc in suspicious[:5]:
            print(f"  - Account: {acc['account_id']} | Risk Score: {acc['risk_score']} | Patterns: {acc['detected_patterns']}")
            
        assert any(acc in ['MULE_RING_1', 'MULE_RING_2', 'MULE_RING_3', 'MULE_SMURF_HUB'] for acc in flagged_ids), \
            "Injected money laundering mule ring / smurf hub was not detected!"
            
        print("\n[SUCCESS] All Large Dataset Assertions Passed Cleanly!")
        
    finally:
        if os.path.exists(large_csv_path):
            try:
                os.remove(large_csv_path)
                print("  [+] Temporary synthetic CSV file cleaned up.")
            except Exception:
                pass


if __name__ == "__main__":
    run_large_dataset_test()
