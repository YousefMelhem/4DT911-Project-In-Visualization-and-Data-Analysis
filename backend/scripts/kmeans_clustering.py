#!/usr/bin/env python3
"""
K-means clustering script for medical cases dataset.
Takes clustering parameters via command line arguments and returns results as JSON.
"""

import json
import sys
import argparse
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import silhouette_score
import warnings

# Suppress sklearn warnings for cleaner output
warnings.filterwarnings('ignore')

def load_data(data_path):
    """Load and prepare the refined cases data."""
    try:
        with open(data_path, 'r') as f:
            data = json.load(f)
        return pd.DataFrame(data)
    except Exception as e:
        return {"error": f"Failed to load data: {str(e)}"}

def prepare_features(df, selected_features):
    """Prepare features for clustering based on user selection."""
    feature_data = []
    feature_names = []
    
    # Available numerical features
    numerical_features = ['complexity_score', 'title_length']
    
    # Available categorical features 
    categorical_features = ['body_system', 'imaging_modality', 'complexity_category']
    
    # Available boolean features
    boolean_features = ['has_multiple_images']
    
    for feature in selected_features:
        if feature in numerical_features:
            if feature in df.columns:
                feature_data.append(df[feature].values)
                feature_names.append(feature)
        
        elif feature in categorical_features:
            if feature in df.columns:
                # Use label encoding for categorical features
                le = LabelEncoder()
                encoded_values = le.fit_transform(df[feature].astype(str))
                feature_data.append(encoded_values)
                feature_names.append(feature)
        
        elif feature in boolean_features:
            if feature in df.columns:
                # Convert boolean to int
                bool_values = df[feature].astype(int).values
                feature_data.append(bool_values)
                feature_names.append(feature)
    
    if not feature_data:
        return None, None, "No valid features selected"
    
    # Combine all features
    features_matrix = np.column_stack(feature_data)
    
    return features_matrix, feature_names, None

def perform_kmeans(features_matrix, n_clusters, random_state=42):
    """Perform K-means clustering with standardized features."""
    try:
        # Standardize features
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features_matrix)
        
        # Perform K-means clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
        cluster_labels = kmeans.fit_predict(features_scaled)
        
        # Calculate silhouette score if more than 1 cluster
        silhouette = None
        if n_clusters > 1 and len(np.unique(cluster_labels)) > 1:
            silhouette = silhouette_score(features_scaled, cluster_labels)
        
        # Get cluster centers (in original scale)
        cluster_centers = scaler.inverse_transform(kmeans.cluster_centers_)
        
        return {
            "cluster_labels": cluster_labels.tolist(),
            "cluster_centers": cluster_centers.tolist(),
            "silhouette_score": silhouette,
            "inertia": kmeans.inertia_,
            "n_iterations": kmeans.n_iter_
        }
    
    except Exception as e:
        return {"error": f"Clustering failed: {str(e)}"}

def calculate_cluster_stats(df, cluster_labels, feature_names):
    """Calculate statistics for each cluster."""
    df_with_clusters = df.copy()
    df_with_clusters['cluster'] = cluster_labels
    
    cluster_stats = {}
    
    for cluster_id in range(len(set(cluster_labels))):
        cluster_data = df_with_clusters[df_with_clusters['cluster'] == cluster_id]
        
        stats = {
            "size": len(cluster_data),
            "percentage": round(len(cluster_data) / len(df_with_clusters) * 100, 2)
        }
        
        # Add feature-specific stats
        for feature in feature_names:
            if feature in ['complexity_score', 'title_length']:
                stats[f"{feature}_mean"] = round(cluster_data[feature].mean(), 2)
                stats[f"{feature}_std"] = round(cluster_data[feature].std(), 2)
            elif feature in ['body_system', 'imaging_modality', 'complexity_category']:
                # Most common category in this cluster
                stats[f"{feature}_mode"] = cluster_data[feature].mode().iloc[0] if not cluster_data[feature].mode().empty else "Unknown"
                stats[f"{feature}_distribution"] = cluster_data[feature].value_counts().to_dict()
            elif feature == 'has_multiple_images':
                stats[f"{feature}_percentage"] = round(cluster_data[feature].mean() * 100, 2)
        
        cluster_stats[f"cluster_{cluster_id}"] = stats
    
    return cluster_stats

def main():
    parser = argparse.ArgumentParser(description='Perform K-means clustering on medical cases')
    parser.add_argument('--data_path', required=True, help='Path to the refined cases JSON file')
    parser.add_argument('--n_clusters', type=int, default=3, help='Number of clusters')
    parser.add_argument('--features', nargs='+', default=['complexity_score', 'body_system', 'has_multiple_images'], 
                       help='Features to use for clustering')
    parser.add_argument('--random_state', type=int, default=42, help='Random state for reproducibility')
    
    args = parser.parse_args()
    
    # Load data
    df = load_data(args.data_path)
    if isinstance(df, dict) and "error" in df:
        print(json.dumps(df))
        sys.exit(1)
    
    # Prepare features
    features_matrix, feature_names, error = prepare_features(df, args.features)
    if error:
        print(json.dumps({"error": error}))
        sys.exit(1)
    
    # Perform clustering
    clustering_result = perform_kmeans(features_matrix, args.n_clusters, args.random_state)
    if "error" in clustering_result:
        print(json.dumps(clustering_result))
        sys.exit(1)
    
    # Calculate cluster statistics
    cluster_stats = calculate_cluster_stats(df, clustering_result["cluster_labels"], feature_names)
    
    # Prepare final result
    result = {
        "success": True,
        "parameters": {
            "n_clusters": args.n_clusters,
            "features_used": feature_names,
            "random_state": args.random_state,
            "total_samples": len(df)
        },
        "clustering_results": clustering_result,
        "cluster_statistics": cluster_stats,
        "cases_with_clusters": []
    }
    
    # Add cluster assignments to a sample of cases (first 100 for performance)
    sample_size = min(100, len(df))
    sample_df = df.head(sample_size).copy()
    sample_df['cluster'] = clustering_result["cluster_labels"][:sample_size]
    
    for _, row in sample_df.iterrows():
        case_info = {
            "url": row.get("URL", ""),
            "case_folder": row.get("Case Folder", ""),
            "case_title": row.get("Case Title", ""),
            "cluster": int(row["cluster"]),
            "features": {}
        }
        
        # Add feature values for this case
        for feature in feature_names:
            if feature in row:
                case_info["features"][feature] = row[feature]
        
        result["cases_with_clusters"].append(case_info)
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()