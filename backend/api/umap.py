"""
UMAP Visualization API
Provides 2D coordinates for interactive scatter plot visualization
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

router = APIRouter()

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
FEATURES_DIR = BASE_DIR / 'data' / 'features'

# Cache for loaded coordinates
_coordinates_cache = {}


def load_umap_coordinates(method: str = 'hybrid'):
    """
    Load UMAP coordinates from JSON file.
    
    Args:
        method: 'text', 'image', or 'hybrid'
    
    Returns:
        Dictionary with coordinates data
    """
    global _coordinates_cache
    
    if method in _coordinates_cache:
        return _coordinates_cache[method]
    
    filename = f'umap_coordinates_{method}.json'
    filepath = FEATURES_DIR / filename
    
    if not filepath.exists():
        raise HTTPException(
            status_code=404,
            detail=f"UMAP coordinates not found for method '{method}'. Please run 03_umap_visualization.ipynb first."
        )
    
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        _coordinates_cache[method] = data
        return data
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading UMAP coordinates: {str(e)}"
        )


@router.get("/coordinates")
async def get_umap_coordinates(method: str = 'hybrid'):
    """
    Get UMAP 2D coordinates for all cases.
    
    Query Parameters:
        method: 'text' | 'image' | 'hybrid' (default: 'hybrid')
    
    Returns:
        {
            "method": "hybrid",
            "total_cases": 7404,
            "coordinates": [
                {
                    "id": "case_123",
                    "x": 1.23,
                    "y": -0.45,
                    "diagnosis": "Pneumonia",
                    "modality": "CT",
                    "region": "Chest",
                    "imageCount": 5,
                    "age": 45,
                    "gender": "Male"
                },
                ...
            ]
        }
    """
    if method not in ['text', 'image', 'hybrid']:
        raise HTTPException(
            status_code=400,
            detail="Invalid method. Must be 'text', 'image', or 'hybrid'"
        )
    
    data = load_umap_coordinates(method)
    return data


@router.get("/methods")
async def get_available_methods():
    """
    Get list of available UMAP projection methods.
    
    Returns:
        {
            "methods": [
                {
                    "value": "text",
                    "label": "Text-based (BERT)",
                    "description": "Semantic similarity from clinical text",
                    "available": true
                },
                ...
            ]
        }
    """
    methods = [
        {
            "value": "text",
            "label": "Text-based (BERT)",
            "description": "Semantic similarity from clinical text",
            "available": (FEATURES_DIR / 'umap_coordinates_text.json').exists()
        },
        {
            "value": "image",
            "label": "Image-based (ResNet)",
            "description": "Visual similarity from medical images",
            "available": (FEATURES_DIR / 'umap_coordinates_image.json').exists()
        },
        {
            "value": "hybrid",
            "label": "Hybrid (Text + Image)",
            "description": "Combined text and visual features",
            "available": (FEATURES_DIR / 'umap_coordinates_hybrid.json').exists()
        }
    ]
    
    return {"methods": methods}


@router.get("/clinical-coordinates")
async def get_clinical_umap_coordinates():
    """
    Get UMAP coordinates with clinical features for medical education.
    
    Returns enhanced data with:
    - diagnosisCategory: Disease type (Trauma, Tumor, Infection, etc.)
    - symptoms: List of presenting symptoms
    - treatmentCategory: Treatment approach (Surgical, Medical, Conservative)
    - cluster: Automatically detected case grouping
    - clinicalExplanation: Why cases are similar
    
    Returns:
        {
            "method": "clinical",
            "total_cases": 7404,
            "coordinates": [
                {
                    "id": "case_123",
                    "x": 1.23,
                    "y": -0.45,
                    "diagnosis": "ACL Tear",
                    "diagnosisCategory": "Trauma/Fracture",
                    "symptoms": ["Pain", "Swelling"],
                    "treatmentCategory": "Surgical",
                    "cluster": 2,
                    "clinicalExplanation": [
                        "Same disease type (Trauma/Fracture)",
                        "Similar symptoms: Pain, Swelling",
                        "Similar treatment (Surgical)"
                    ],
                    "imageCount": 5,
                    "age": 28,
                    "gender": "Male"
                },
                ...
            ]
        }
    """
    global _coordinates_cache
    
    cache_key = 'clinical'
    if cache_key in _coordinates_cache:
        return _coordinates_cache[cache_key]
    
    filepath = FEATURES_DIR / 'umap_clinical_enhanced.json'
    
    if not filepath.exists():
        raise HTTPException(
            status_code=404,
            detail="Clinical UMAP data not found. Please run 04_clinical_similarity_clusters.ipynb first."
        )
    
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        _coordinates_cache[cache_key] = data
        return data
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading clinical UMAP data: {str(e)}"
        )


@router.get("/similar-cases/{case_id}")
async def get_similar_cases(case_id: str, top_k: int = 5):
    """
    Get most similar cases with clinical explanations.
    
    Path Parameters:
        case_id: The case ID to find similar cases for
    
    Query Parameters:
        top_k: Number of similar cases to return (default: 5)
    
    Returns:
        {
            "query_case_id": "case_123",
            "similar_cases": [
                {
                    "id": "case_456",
                    "diagnosis": "Meniscus Tear",
                    "category": "Trauma/Fracture",
                    "symptoms": ["Pain", "Swelling"],
                    "whySimilar": [
                        "Same disease type (Trauma/Fracture)",
                        "Similar symptoms: Pain, Swelling"
                    ],
                    "distance": 0.23
                },
                ...
            ]
        }
    """
    # Load similarity lookup
    lookup_file = FEATURES_DIR / 'case_similarity_lookup.json'
    
    if not lookup_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Similarity lookup not found. Please run 04_clinical_similarity_clusters.ipynb first."
        )
    
    try:
        with open(lookup_file, 'r') as f:
            lookup = json.load(f)
        
        if case_id not in lookup:
            raise HTTPException(
                status_code=404,
                detail=f"Similar cases not pre-computed for case {case_id}"
            )
        
        similar = lookup[case_id][:top_k]
        
        return {
            "query_case_id": case_id,
            "similar_cases": similar
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading similar cases: {str(e)}"
        )


@router.get("/statistics")
async def get_clinical_statistics():
    """
    Get statistics about diagnosis categories, symptoms, and treatments.
    
    Returns:
        {
            "total_cases": 7404,
            "diagnosis_categories": {
                "Trauma/Fracture": 808,
                "Tumor/Cancer": 579,
                ...
            },
            "treatment_types": {
                "Surgical": 1250,
                "Conservative": 3200,
                ...
            },
            "clusters": 15
        }
    """
    try:
        # Load clinical data
        filepath = FEATURES_DIR / 'umap_clinical_enhanced.json'
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        coordinates = data['coordinates']
        
        # Count diagnosis categories
        from collections import Counter
        diagnosis_counts = Counter(p['diagnosisCategory'] for p in coordinates)
        treatment_counts = Counter(p['treatmentCategory'] for p in coordinates)
        
        # Count clusters
        clusters = set(p['cluster'] for p in coordinates if p['cluster'] >= 0)
        
        # Count symptoms
        all_symptoms = []
        for p in coordinates:
            all_symptoms.extend(p.get('symptoms', []))
        symptom_counts = Counter(all_symptoms)
        
        return {
            "total_cases": len(coordinates),
            "diagnosis_categories": dict(diagnosis_counts),
            "treatment_types": dict(treatment_counts),
            "top_symptoms": dict(symptom_counts.most_common(10)),
            "total_clusters": len(clusters),
            "outlier_cases": sum(1 for p in coordinates if p['cluster'] == -1)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error computing statistics: {str(e)}"
        )
