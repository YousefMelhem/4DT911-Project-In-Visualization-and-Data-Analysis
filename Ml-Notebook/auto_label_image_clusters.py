"""
Auto-generate cluster labels based on most common diagnoses
"""
import json
from pathlib import Path
from collections import Counter

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
FEATURES_DIR = PROJECT_ROOT / 'data' / 'features'

# Load data
with open(FEATURES_DIR / 'image_metadata_medclip.json') as f:
    metadata = json.load(f)

with open(FEATURES_DIR / 'diagnosis_image_clusters.json') as f:
    cluster_data = json.load(f)

case_metadata = metadata['case_metadata']
clusters = cluster_data['clusters']

# Group diagnoses by cluster
cluster_diagnoses = {}
for i, cluster_id in enumerate(clusters):
    if cluster_id not in cluster_diagnoses:
        cluster_diagnoses[cluster_id] = []
    diagnosis = case_metadata[i].get('diagnosis', 'Unknown')
    cluster_diagnoses[cluster_id].append(diagnosis)

# Generate labels based on most common diagnosis
cluster_labels = {}
for cluster_id in sorted(cluster_diagnoses.keys()):
    diagnoses = cluster_diagnoses[cluster_id]
    
    # Get top 3 most common
    counter = Counter(diagnoses)
    top_3 = counter.most_common(3)
    
    # Create label from most common diagnosis (truncated)
    if top_3:
        main_diag = top_3[0][0]
        count = top_3[0][1]
        total = len(diagnoses)
        
        # Truncate and clean diagnosis name
        label = main_diag[:40].strip()
        if len(main_diag) > 40:
            label += "..."
        
        # Add prevalence info
        pct = (count / total) * 100
        label_with_info = f"{label} ({count}/{total}, {pct:.0f}%)"
        
        cluster_labels[str(cluster_id)] = label_with_info
        
        print(f"\nCluster {cluster_id}: {total} cases")
        print(f"  Label: {label_with_info}")
        print(f"  Top diagnoses:")
        for i, (diag, cnt) in enumerate(top_3, 1):
            pct = (cnt / total) * 100
            print(f"    {i}. {diag[:60]} ({cnt}, {pct:.0f}%)")
    else:
        cluster_labels[str(cluster_id)] = f"Image Cluster {cluster_id}"

# Save
output = {"cluster_labels": cluster_labels}

with open(FEATURES_DIR / 'cluster_labels_image.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"\n✅ Saved labels to {FEATURES_DIR / 'cluster_labels_image.json'}")
print("\n💡 You can manually edit this file to improve the labels!")
