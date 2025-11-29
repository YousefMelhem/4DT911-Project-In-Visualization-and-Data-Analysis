"""
Add image cluster labels as regions to case data
"""
import json
from pathlib import Path

# Paths
DATA_DIR = Path(__file__).parent.parent / "data"
FEATURES_DIR = DATA_DIR / "features"
PROCESSED_DIR = DATA_DIR / "processed"

# Load image cluster data
print("Loading image cluster data...")
with open(FEATURES_DIR / "diagnosis_image_clusters.json", 'r') as f:
    image_clusters = json.load(f)

with open(FEATURES_DIR / "cluster_labels_image.json", 'r') as f:
    cluster_labels_data = json.load(f)
    cluster_labels = cluster_labels_data['cluster_labels']

print(f"Loaded {len(cluster_labels)} image cluster labels")

# Create diagnosis to cluster mapping
diagnosis_to_cluster = {}
for i, diagnosis in enumerate(image_clusters['diagnoses']):
    cluster_id = image_clusters['clusters'][i]
    diagnosis_to_cluster[diagnosis] = cluster_id

print(f"Created mapping for {len(diagnosis_to_cluster)} diagnoses")

# Load cases
print("Loading cases...")
with open(PROCESSED_DIR / "cases_cleaned_v2.json", 'r') as f:
    cases = json.load(f)

with open(PROCESSED_DIR / "cases_summary_v2.json", 'r') as f:
    summaries = json.load(f)

# Update cases with image cluster regions
updated_cases = 0
for case in cases:
    diagnosis = case.get('diagnosis')
    if diagnosis and diagnosis in diagnosis_to_cluster:
        cluster_id = diagnosis_to_cluster[diagnosis]
        cluster_label = cluster_labels.get(str(cluster_id), f"Cluster {cluster_id}")
        
        # Set cluster label as region (single-level to avoid duplication)
        case['regions'] = {
            "Imaging Category": [cluster_label]
        }
        case['image_cluster_id'] = cluster_id
        case['image_cluster_label'] = cluster_label
        updated_cases += 1

print(f"Updated {updated_cases} cases with image cluster information")

# Update summaries
updated_summaries = 0
for summary in summaries:
    diagnosis = summary.get('diagnosis')
    if diagnosis and diagnosis in diagnosis_to_cluster:
        cluster_id = diagnosis_to_cluster[diagnosis]
        cluster_label = cluster_labels.get(str(cluster_id), f"Cluster {cluster_id}")
        
        # Set cluster label as region (single-level to avoid duplication)
        summary['regions'] = {
            "Imaging Category": [cluster_label]
        }
        summary['image_cluster_id'] = cluster_id
        summary['image_cluster_label'] = cluster_label
        updated_summaries += 1

print(f"Updated {updated_summaries} summaries with image cluster information")

# Save updated data
print("Saving updated data...")
with open(PROCESSED_DIR / "cases_cleaned_v2.json", 'w') as f:
    json.dump(cases, f, indent=2)

with open(PROCESSED_DIR / "cases_summary_v2.json", 'w') as f:
    json.dump(summaries, f, indent=2)

print("Done! Cases now use image cluster labels as regions.")
print("\nExample cluster labels:")
for i in range(min(5, len(cluster_labels))):
    print(f"  {i}: {cluster_labels[str(i)]}")
