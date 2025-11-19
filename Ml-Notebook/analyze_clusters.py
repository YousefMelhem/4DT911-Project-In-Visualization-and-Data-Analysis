#!/usr/bin/env python3
"""
Analyze BioBERT clusters and suggest category labels
"""

import pandas as pd
import json
from collections import Counter

# Load cluster data
df = pd.read_csv('../data/features/diagnosis_clusters.csv')

print("="*100)
print("BioBERT DIAGNOSIS CLUSTERING ANALYSIS")
print("="*100)

num_clusters = df['cluster'].nunique()
total_cases = df['frequency'].sum()

print(f"\nTotal clusters: {num_clusters}")
print(f"Total unique diagnoses: {len(df)}")
print(f"Total cases: {total_cases}")

# Analyze each cluster
print("\n" + "="*100)
print("CLUSTER BREAKDOWN - Top 10 diagnoses per cluster")
print("="*100)

for cluster_id in range(num_clusters):
    cluster_df = df[df['cluster'] == cluster_id]
    cluster_cases = cluster_df['frequency'].sum()
    cluster_pct = (cluster_cases / total_cases) * 100
    
    print(f"\n{'='*100}")
    print(f"CLUSTER {cluster_id} - {len(cluster_df)} diagnoses, {cluster_cases} cases ({cluster_pct:.1f}%)")
    print(f"{'='*100}")
    
    # Show top 10
    top_10 = cluster_df.head(10)
    for idx, row in top_10.iterrows():
        diag_short = row['diagnosis'][:80] + '...' if len(row['diagnosis']) > 80 else row['diagnosis']
        print(f"  {row['frequency']:4d} × {diag_short}")
    
    if len(cluster_df) > 10:
        print(f"  ... and {len(cluster_df) - 10} more")

print(f"\n{'='*100}")
print("SUMMARY BY CLUSTER SIZE (number of cases)")
print(f"{'='*100}")

cluster_summary = df.groupby('cluster').agg({
    'frequency': 'sum',
    'diagnosis': 'count'
}).rename(columns={'diagnosis': 'num_diagnoses'}).sort_values('frequency', ascending=False)

for cluster_id, row in cluster_summary.iterrows():
    pct = (row['frequency'] / total_cases) * 100
    print(f"Cluster {cluster_id:2d}: {row['frequency']:5d} cases ({pct:5.1f}%) - {row['num_diagnoses']:4d} unique diagnoses")

print("\n" + "="*100)
print("NEXT STEP: Review clusters above and manually assign category names")
print("="*100)
