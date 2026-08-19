"""
Test script for Two-Stage Scalable AML Detection Pipeline
Tests DuckDB out-of-core Stage 1 candidate feature extraction and Stage 2 bounded NetworkX graph analysis.
"""

import os
import sys
import tempfile
import time

def run_tests():
    print("== Starting Scalable AML Pipeline Tests ==")
    
    # 1. Import modules
    try:
        from scalable_analyzer import analyze_transactions_scalable
        import duckdb
        import networkx as nx
        print("  [+] Successfully imported duckdb, networkx, and scalable_analyzer")
    except Exception as e:
        print(f"  [-] Import error: {e}")
        sys.exit(1)

        
    temp_dir = tempfile.gettempdir()
    
    # 2. Test standard CSV format with a money muling cycle
    print("\n--------------------------------------------------")
    print("Test 1: Standard CSV with Money Muling Ring (Cycle: ACC_101 -> ACC_102 -> ACC_103 -> ACC_101)")
    std_csv_path = os.path.join(temp_dir, "test_std_aml.csv")
    
    with open(std_csv_path, "w", encoding="utf-8") as f:
        f.write("sender_id,receiver_id,amount,is_laundering\n")
        # Cycle 1: 101 -> 102 -> 103 -> 101 (Laundering)
        f.write("ACC_101,ACC_102,5000,1\n")
        f.write("ACC_102,ACC_103,4900,1\n")
        f.write("ACC_103,ACC_101,4800,1\n")
        # Smurfing: ACC_200 receives from 10 accounts
        for i in range(1, 11):
            f.write(f"ACC_SMURF_{i},ACC_200,1000,0\n")
        f.write("ACC_200,ACC_CASH_OUT,9500,0\n")
        # Normal traffic
        for i in range(1, 100):
            f.write(f"NORMAL_SEND_{i},NORMAL_RECV_{i},100,0\n")
            
    try:
        output, G = analyze_transactions_scalable(std_csv_path, max_neighborhood_nodes=1000)
        
        print(f"  Stage 1 Candidates Evaluated: {output['summary'].get('stage1_candidates_evaluated')}")
        print(f"  Stage 2 Bounded Subgraph Nodes: {output['summary'].get('bounded_graph_nodes')} (Must be <= 1000)")
        print(f"  Stage 2 Bounded Subgraph Edges: {output['summary'].get('bounded_graph_edges')}")
        print(f"  Suspicious Accounts Flagged: {output['summary']['suspicious_accounts_flagged']}")
        print(f"  Fraud Rings Detected: {output['summary']['fraud_rings_detected']}")
        
        assert G.number_of_nodes() <= 1000, "Bounded graph exceeded 1000 nodes limit!"
        assert output['summary']['suspicious_accounts_flagged'] > 0, "No suspicious accounts detected!"
        assert any(acc['account_id'] in ['ACC_101', 'ACC_102', 'ACC_103'] for acc in output['suspicious_accounts']), "Mule ring nodes not flagged!"
        print("  [+] Test 1 Passed Successfully!")
    finally:
        if os.path.exists(std_csv_path):
            os.remove(std_csv_path)

    # 3. Test IBM AML CSV format (Account, Account.1, Amount Paid, Is Laundering)
    print("\n--------------------------------------------------")
    print("Test 2: IBM AML Dataset CSV Schema Format")
    ibm_csv_path = os.path.join(temp_dir, "test_ibm_aml.csv")
    
    with open(ibm_csv_path, "w", encoding="utf-8") as f:
        f.write("Timestamp,From Bank,Account,To Bank,Account.1,Amount Received,Receiving Currency,Amount Paid,Payment Currency,Payment Format,Is Laundering\n")
        # IBM Cycle: MULE_A -> MULE_B -> MULE_C -> MULE_A
        f.write("2026/01/01 10:00,10,MULE_A,20,MULE_B,10000,USD,10000,USD,Wire,1\n")
        f.write("2026/01/01 11:00,20,MULE_B,30,MULE_C,9800,USD,9800,USD,Wire,1\n")
        f.write("2026/01/01 12:00,30,MULE_C,10,MULE_A,9600,USD,9600,USD,Wire,1\n")
        # Fan-in: MULE_D receives from 10 senders
        for i in range(12):
            f.write(f"2026/01/01 13:00,{i},USER_{i},40,MULE_D,500,USD,500,USD,ACH,0\n")
        f.write("2026/01/01 14:00,40,MULE_D,50,OUT_DEST,5800,USD,5800,USD,ACH,0\n")
        
    try:
        output_ibm, G_ibm = analyze_transactions_scalable(ibm_csv_path, max_neighborhood_nodes=1000)
        
        print(f"  Stage 1 Candidates Evaluated: {output_ibm['summary'].get('stage1_candidates_evaluated')}")
        print(f"  Stage 2 Bounded Subgraph Nodes: {output_ibm['summary'].get('bounded_graph_nodes')} (Must be <= 1000)")
        print(f"  Suspicious Accounts Flagged: {output_ibm['summary']['suspicious_accounts_flagged']}")
        print(f"  Fraud Rings Detected: {output_ibm['summary']['fraud_rings_detected']}")
        
        assert G_ibm.number_of_nodes() <= 1000, "Bounded graph exceeded 1000 nodes limit!"
        assert output_ibm['summary']['suspicious_accounts_flagged'] > 0, "No suspicious accounts detected in IBM format!"
        print("  [+] Test 2 Passed Successfully!")
    finally:
        if os.path.exists(ibm_csv_path):
            os.remove(ibm_csv_path)

    # 4. Test Large Node Bounding Logic (Simulating > 1500 nodes)
    print("\n--------------------------------------------------")
    print("Test 3: Node Bounding Constraint Verification (Generated > 1,200 Nodes)")
    large_csv_path = os.path.join(temp_dir, "test_large_nodes.csv")
    
    with open(large_csv_path, "w", encoding="utf-8") as f:
        f.write("sender_id,receiver_id,amount,is_laundering\n")
        # Create a mule ring
        f.write("RING_1,RING_2,10000,1\n")
        f.write("RING_2,RING_3,9900,1\n")
        f.write("RING_3,RING_1,9800,1\n")
        # Generate 1500 distinct accounts connected to candidate nodes
        for i in range(1200):
            f.write(f"CANDIDATE_HUB,PERIPHERAL_ACC_{i},100,0\n")

    try:
        output_large, G_large = analyze_transactions_scalable(large_csv_path, max_neighborhood_nodes=1000)
        
        node_count = G_large.number_of_nodes()
        print(f"  Extracted Subgraph Nodes: {node_count}")
        print(f"  Bounded Nodes Check: {node_count} <= 1000 -> {node_count <= 1000}")
        
        assert node_count <= 1000, f"Bounded graph violated 1,000 node cap! Got {node_count} nodes."
        print("  [+] Test 3 Node Bounding Passed Successfully!")
    finally:
        if os.path.exists(large_csv_path):
            os.remove(large_csv_path)

    # 5. Test Custom Headers: Bank Name, Bank ID, Account Number, Entity ID, Entity Name
    print("\n--------------------------------------------------")
    print("Test 4: Custom Bank CSV Schema ['Bank Name', 'Bank ID', 'Account Number', 'Entity ID', 'Entity Name']")
    custom_csv_path = os.path.join(temp_dir, "test_custom_bank.csv")
    
    with open(custom_csv_path, "w", encoding="utf-8") as f:
        f.write("Bank Name,Bank ID,Account Number,Entity ID,Entity Name\n")
        f.write("Chase,101,ACC_1001,ENT_2001,John Doe\n")
        f.write("Citi,102,ACC_1002,ENT_2002,Jane Doe\n")
        f.write("Wells,103,ACC_1003,ENT_2003,Bob Smith\n")
        f.write("Chase,101,ACC_1001,ENT_2002,Jane Doe\n")
        
    try:
        output_custom, G_custom = analyze_transactions_scalable(custom_csv_path, max_neighborhood_nodes=1000)
        print(f"  Extracted Subgraph Nodes: {G_custom.number_of_nodes()}")
        assert G_custom.number_of_nodes() > 0, "Failed to analyze custom bank CSV schema!"
        print("  [+] Test 4 Custom Headers Passed Successfully!")
    finally:
        if os.path.exists(custom_csv_path):
            os.remove(custom_csv_path)

    print("\n[ALL TESTS PASSED SUCCESSFULLY]")


if __name__ == "__main__":
    run_tests()
