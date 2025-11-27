"""
Script to inspect and label image clusters
Shows sample images from each cluster to help with manual labeling
"""
import json
import numpy as np
from pathlib import Path
from PIL import Image
import matplotlib.pyplot as plt

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / 'data'
ARCHIVE_DIR = DATA_DIR / 'archive' / 'medpix_data_final' / 'medpix_data_final'
FEATURES_DIR = DATA_DIR / 'features'

# Load metadata
with open(FEATURES_DIR / 'image_metadata_medclip.json') as f:
    metadata = json.load(f)

case_metadata = metadata['case_metadata']

# Load cluster assignments
cluster_labels = np.load(FEATURES_DIR / 'image_embeddings_medclip.npy')
with open(FEATURES_DIR / 'diagnosis_image_clusters.json') as f:
    cluster_data = json.load(f)

clusters = cluster_data['clusters']

# Group cases by cluster
cluster_groups = {}
for i, cluster_id in enumerate(clusters):
    if cluster_id not in cluster_groups:
        cluster_groups[cluster_id] = []
    cluster_groups[cluster_id].append(case_metadata[i])

print(f"\n📊 Found {len(cluster_groups)} clusters\n")

# Function to display sample images from a cluster
def inspect_cluster(cluster_id, num_samples=6):
    """Display sample images from a specific cluster"""
    cases = cluster_groups[cluster_id]
    print(f"\n🔍 Cluster {cluster_id}: {len(cases)} cases")
    
    # Sample random cases
    sample_size = min(num_samples, len(cases))
    sample_indices = np.random.choice(len(cases), sample_size, replace=False)
    
    # Create figure
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    fig.suptitle(f'Cluster {cluster_id} - Sample Images ({len(cases)} total cases)', 
                 fontsize=16, fontweight='bold')
    
    for idx, sample_idx in enumerate(sample_indices):
        row = idx // 3
        col = idx % 3
        ax = axes[row, col]
        
        case = cases[sample_idx]
        case_id = case['case_id']
        diagnosis = case['diagnosis']
        
        # Load first image
        case_folder = ARCHIVE_DIR / f"case_{case_id}"
        images = [f for f in case_folder.iterdir() if f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif']]
        
        if images:
            img = Image.open(images[0])
            ax.imshow(img)
            ax.set_title(f"{diagnosis[:40]}...\n{case['image_count']} imgs", fontsize=9)
            ax.axis('off')
        else:
            ax.text(0.5, 0.5, 'No image', ha='center', va='center')
            ax.axis('off')
    
    # Hide empty subplots
    for idx in range(sample_size, 6):
        row = idx // 3
        col = idx % 3
        axes[row, col].axis('off')
    
    plt.tight_layout()
    plt.show()
    
    # Print diagnoses
    print("\n📋 Sample diagnoses in this cluster:")
    for i, sample_idx in enumerate(sample_indices[:5]):
        print(f"   {i+1}. {cases[sample_idx]['diagnosis']}")
    print()

# Interactive inspection
print("=" * 70)
print("IMAGE CLUSTER INSPECTION TOOL")
print("=" * 70)
print("\nCommands:")
print("  - Enter cluster number (0-24) to inspect")
print("  - 'all' to see overview of all clusters")
print("  - 'summary' to see cluster sizes")
print("  - 'quit' to exit")
print()

# Show summary first
print("\n📊 CLUSTER SUMMARY:")
for cluster_id in sorted(cluster_groups.keys()):
    cases = cluster_groups[cluster_id]
    # Get most common diagnoses
    diag_counts = {}
    for case in cases:
        diag = case['diagnosis']
        diag_counts[diag] = diag_counts.get(diag, 0) + 1
    top_diag = sorted(diag_counts.items(), key=lambda x: x[1], reverse=True)[0] if diag_counts else ("N/A", 0)
    
    print(f"  Cluster {cluster_id:2d}: {len(cases):4d} cases - Top: {top_diag[0][:50]} ({top_diag[1]})")

print("\n" + "=" * 70)

# Interactive loop
while True:
    command = input("\nEnter command: ").strip().lower()
    
    if command == 'quit':
        break
    elif command == 'summary':
        for cluster_id in sorted(cluster_groups.keys()):
            print(f"Cluster {cluster_id}: {len(cluster_groups[cluster_id])} cases")
    elif command == 'all':
        # Quick overview of all clusters (2 images each)
        for cluster_id in sorted(cluster_groups.keys())[:5]:  # First 5 clusters
            inspect_cluster(cluster_id, num_samples=4)
    elif command.isdigit():
        cluster_id = int(command)
        if cluster_id in cluster_groups:
            inspect_cluster(cluster_id)
        else:
            print(f"❌ Cluster {cluster_id} not found. Valid range: 0-{max(cluster_groups.keys())}")
    else:
        print("❌ Invalid command. Try a number (0-24), 'all', 'summary', or 'quit'")

print("\n👋 Done! Now edit data/features/cluster_labels_image.json with your labels")
