"""
Medical Case Similarity Search API
Integrates TF-IDF, BERT, and Image embeddings for comprehensive similarity search
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Literal
import numpy as np
import json
import scipy.sparse as sp
import joblib
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity

router = APIRouter()

# ============================================
# Load Models and Data
# ============================================

DATA_DIR = Path(__file__).parent.parent.parent / "data"
FEATURES_DIR = DATA_DIR / "features"
ML_READY_DIR = DATA_DIR / "ml_ready"

# Load cases
print("Loading ML-ready cases...")
with open(ML_READY_DIR / "cases_ml_ready.json", 'r') as f:
    cases = json.load(f)

# Load case IDs mapping
with open(FEATURES_DIR / "case_ids.json", 'r') as f:
    case_ids = json.load(f)

# Load TF-IDF model
print("Loading TF-IDF model...")
tfidf_matrix = sp.load_npz(FEATURES_DIR / "tfidf_features.npz")
tfidf_vectorizer = joblib.load(FEATURES_DIR / "tfidf_vectorizer.pkl")

# Load BERT embeddings
print("Loading BERT embeddings...")
bert_embeddings = np.load(FEATURES_DIR / "text_embeddings_bert.npy")

# Load BERT model for new queries
from sentence_transformers import SentenceTransformer
print("Loading BERT model...")
bert_model = SentenceTransformer('all-MiniLM-L6-v2')

# Load Image embeddings (if available)
image_embeddings = None
image_available = False
try:
    image_embeddings_path = FEATURES_DIR / "image_embeddings_resnet50.npy"
    if image_embeddings_path.exists():
        print("Loading Image embeddings...")
        image_embeddings = np.load(image_embeddings_path)
        image_available = True
        print(f"✅ Image embeddings loaded: {image_embeddings.shape}")
    else:
        print("⚠️ Image embeddings not found - image search disabled")
except Exception as e:
    print(f"⚠️ Could not load image embeddings: {e}")

print("✅ All models loaded successfully!")

# ============================================
# Pydantic Models
# ============================================

class SimilarCase(BaseModel):
    id: str
    diagnosis: str
    history: Optional[str] = None
    findings: Optional[str] = None
    imageCount: int
    imagePaths: List[str]
    similarity: float
    rank: int
    text_similarity: Optional[float] = None
    image_similarity: Optional[float] = None

class SimilarityResponse(BaseModel):
    query_case_id: Optional[str] = None
    query_text: Optional[str] = None
    method: str
    results: List[SimilarCase]
    total_cases_searched: int
    search_time_ms: float

class TextSearchRequest(BaseModel):
    text: str
    method: Literal["tfidf", "bert", "both", "image", "hybrid"] = "bert"
    top_k: int = 10

# ============================================
# Helper Functions
# ============================================

def get_case_by_id(case_id: str):
    """Get case by ID"""
    for idx, c in enumerate(cases):
        if c['id'] == case_id:
            return idx, c
    return None, None

def find_similar_tfidf(query_vector, k=10):
    """Find similar cases using TF-IDF"""
    similarities = cosine_similarity(query_vector, tfidf_matrix).flatten()
    top_indices = np.argsort(similarities)[::-1][:k]
    return [(idx, float(similarities[idx])) for idx in top_indices]

def find_similar_bert(query_embedding, k=10):
    """Find similar cases using BERT"""
    query_embedding = query_embedding.reshape(1, -1)
    similarities = cosine_similarity(query_embedding, bert_embeddings).flatten()
    top_indices = np.argsort(similarities)[::-1][:k]
    return [(idx, float(similarities[idx])) for idx in top_indices]

def find_similar_image(query_embedding, k=10):
    """Find similar cases using Image embeddings"""
    if image_embeddings is None:
        raise HTTPException(status_code=503, detail="Image embeddings not available")
    
    query_embedding = query_embedding.reshape(1, -1)
    similarities = cosine_similarity(query_embedding, image_embeddings).flatten()
    top_indices = np.argsort(similarities)[::-1][:k]
    return [(idx, float(similarities[idx])) for idx in top_indices]

def find_similar_hybrid(text_embedding, img_embedding, k=10, text_weight=0.5):
    """
    Find similar cases using hybrid text + image similarity
    
    Args:
        text_embedding: BERT text embedding
        img_embedding: ResNet50 image embedding
        k: Number of results
        text_weight: Weight for text similarity (0-1), image weight = 1 - text_weight
    
    Returns:
        List of (index, combined_score, text_score, image_score) tuples
    """
    if image_embeddings is None:
        # Fall back to text-only
        return find_similar_bert(text_embedding, k)
    
    # Compute text similarities
    text_embedding = text_embedding.reshape(1, -1)
    text_sims = cosine_similarity(text_embedding, bert_embeddings).flatten()
    
    # Compute image similarities
    img_embedding = img_embedding.reshape(1, -1)
    img_sims = cosine_similarity(img_embedding, image_embeddings).flatten()
    
    # Combine with weights
    image_weight = 1 - text_weight
    combined_sims = (text_weight * text_sims) + (image_weight * img_sims)
    
    # Get top k
    top_indices = np.argsort(combined_sims)[::-1][:k]
    
    return [
        (idx, float(combined_sims[idx]), float(text_sims[idx]), float(img_sims[idx])) 
        for idx in top_indices
    ]

def format_results(similar_cases, method):
    """Format similarity results for API response"""
    results = []
    
    # Check if we have hybrid results (4-tuple vs 2-tuple)
    if similar_cases and len(similar_cases[0]) == 4:
        # Hybrid results: (idx, combined_score, text_score, img_score)
        for rank, (idx, combined_score, text_score, img_score) in enumerate(similar_cases, 1):
            case = cases[idx]
            results.append(SimilarCase(
                id=case['id'],
                diagnosis=case.get('diagnosis', ''),
                history=case.get('history'),
                findings=case.get('findings'),
                imageCount=case.get('imageCount', 0),
                imagePaths=case.get('imagePaths', []),
                similarity=round(combined_score, 4),
                text_similarity=round(text_score, 4),
                image_similarity=round(img_score, 4),
                rank=rank
            ))
    else:
        # Standard results: (idx, score)
        for rank, (idx, score) in enumerate(similar_cases, 1):
            case = cases[idx]
            results.append(SimilarCase(
                id=case['id'],
                diagnosis=case.get('diagnosis', ''),
                history=case.get('history'),
                findings=case.get('findings'),
                imageCount=case.get('imageCount', 0),
                imagePaths=case.get('imagePaths', []),
                similarity=round(score, 4),
                rank=rank
            ))
    
    return results

# ============================================
# API Endpoints
# ============================================

@router.get("/similar/{case_id}", response_model=SimilarityResponse)
async def find_similar_by_case_id(
    case_id: str,
    method: Literal["tfidf", "bert", "image", "hybrid"] = "bert",
    top_k: int = Query(default=10, ge=1, le=50),
    text_weight: float = Query(default=0.5, ge=0.0, le=1.0)
):
    """
    Find similar cases by case ID
    
    Args:
        case_id: The ID of the case to find similar cases for
        method: Similarity method ("tfidf", "bert", "image", or "hybrid")
        top_k: Number of similar cases to return (1-50)
        text_weight: Weight for text similarity in hybrid mode (0-1)
    
    Returns:
        List of similar cases with similarity scores
    """
    import time
    start_time = time.time()
    
    # Find case index
    idx, case = get_case_by_id(case_id)
    if idx is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    # Find similar cases based on method
    if method == "tfidf":
        query_vector = tfidf_matrix[idx]
        similar = find_similar_tfidf(query_vector, k=top_k + 1)
        # Skip first result (query itself)
        similar = similar[1:] if similar[0][0] == idx else similar[:top_k]
    elif method == "bert":
        query_embedding = bert_embeddings[idx]
        similar = find_similar_bert(query_embedding, k=top_k + 1)
        # Skip first result (query itself)
        similar = similar[1:] if similar[0][0] == idx else similar[:top_k]
    elif method == "image":
        if not image_available:
            raise HTTPException(status_code=503, detail="Image embeddings not available")
        query_embedding = image_embeddings[idx]
        similar = find_similar_image(query_embedding, k=top_k + 1)
        # Skip first result (query itself)
        similar = similar[1:] if similar[0][0] == idx else similar[:top_k]
    else:  # hybrid
        if not image_available:
            raise HTTPException(status_code=503, detail="Image embeddings not available for hybrid search")
        text_embedding = bert_embeddings[idx]
        img_embedding = image_embeddings[idx]
        similar = find_similar_hybrid(text_embedding, img_embedding, k=top_k + 1, text_weight=text_weight)
        # Skip first result (query itself)
        similar = similar[1:] if len(similar) > 0 and similar[0][0] == idx else similar[:top_k]
    
    search_time_ms = (time.time() - start_time) * 1000
    
    return SimilarityResponse(
        query_case_id=case_id,
        method=method,
        results=format_results(similar, method),
        total_cases_searched=len(cases),
        search_time_ms=round(search_time_ms, 2)
    )

@router.post("/search", response_model=SimilarityResponse)
async def search_by_text(request: TextSearchRequest):
    """
    Search for similar cases using custom text query
    
    Args:
        text: The query text (e.g., diagnosis, symptoms)
        method: Similarity method ("tfidf", "bert", or "both")
        top_k: Number of results to return
    
    Returns:
        List of similar cases with similarity scores
    """
    import time
    start_time = time.time()
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty")
    
    results = []
    
    if request.method in ["tfidf", "both"]:
        # Transform text using TF-IDF
        query_vector = tfidf_vectorizer.transform([request.text])
        similar = find_similar_tfidf(query_vector, k=request.top_k)
        
        if request.method == "tfidf":
            results = format_results(similar, "tfidf")
    
    if request.method in ["bert", "both"]:
        # Encode text using BERT
        query_embedding = bert_model.encode([request.text], convert_to_numpy=True)
        similar = find_similar_bert(query_embedding[0], k=request.top_k)
        
        if request.method == "bert":
            results = format_results(similar, "bert")
    
    if request.method == "both":
        # For "both", return BERT results (you can combine later)
        results = format_results(similar, "both")
    
    search_time_ms = (time.time() - start_time) * 1000
    
    return SimilarityResponse(
        query_text=request.text,
        method=request.method,
        results=results,
        total_cases_searched=len(cases),
        search_time_ms=round(search_time_ms, 2)
    )

@router.get("/compare/{case_id}")
async def compare_methods(
    case_id: str,
    top_k: int = Query(default=10, ge=1, le=50)
):
    """
    Compare TF-IDF vs BERT results for a case
    
    Returns both TF-IDF and BERT results side-by-side
    """
    import time
    start_time = time.time()
    
    # Find case
    idx, case = get_case_by_id(case_id)
    if idx is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    # Get TF-IDF results
    query_vector = tfidf_matrix[idx]
    tfidf_similar = find_similar_tfidf(query_vector, k=top_k + 1)[1:]
    
    # Get BERT results
    query_embedding = bert_embeddings[idx]
    bert_similar = find_similar_bert(query_embedding, k=top_k + 1)[1:]
    
    # Calculate overlap
    tfidf_ids = set([cases[i]['id'] for i, _ in tfidf_similar])
    bert_ids = set([cases[i]['id'] for i, _ in bert_similar])
    overlap_count = len(tfidf_ids & bert_ids)
    
    search_time_ms = (time.time() - start_time) * 1000
    
    return {
        "query_case_id": case_id,
        "query_diagnosis": case.get('diagnosis', ''),
        "tfidf_results": format_results(tfidf_similar, "tfidf"),
        "bert_results": format_results(bert_similar, "bert"),
        "overlap_count": overlap_count,
        "overlap_percentage": round((overlap_count / top_k) * 100, 1),
        "search_time_ms": round(search_time_ms, 2)
    }

@router.get("/stats")
async def get_model_stats():
    """Get statistics about loaded models"""
    with open(FEATURES_DIR / "tfidf_metadata.json") as f:
        tfidf_meta = json.load(f)
    
    with open(FEATURES_DIR / "bert_metadata.json") as f:
        bert_meta = json.load(f)
    
    stats = {
        "total_cases": len(cases),
        "image_available": image_available,
        "tfidf": {
            "num_features": tfidf_meta['num_features'],
            "sparsity": round(tfidf_meta['sparsity'], 4),
            "mean_similarity": round(tfidf_meta['mean_similarity'], 4),
            "median_similarity": round(tfidf_meta['median_similarity'], 4)
        },
        "bert": {
            "model_name": bert_meta['model_name'],
            "embedding_dimension": bert_meta['embedding_dimension'],
            "mean_similarity": round(bert_meta['mean_similarity'], 4),
            "median_similarity": round(bert_meta['median_similarity'], 4),
            "extraction_time_seconds": round(bert_meta['extraction_time_seconds'], 2)
        }
    }
    
    # Add image stats if available
    if image_available:
        try:
            with open(FEATURES_DIR / "image_metadata.json") as f:
                image_meta = json.load(f)
            stats["image"] = {
                "model_name": image_meta['model_name'],
                "embedding_dimension": image_meta['embedding_dimension'],
                "cases_with_images": image_meta['cases_with_images'],
                "cases_missing_images": image_meta['cases_missing_images'],
                "mean_similarity": round(image_meta['mean_similarity'], 4),
                "median_similarity": round(image_meta['median_similarity'], 4),
                "extraction_time_seconds": round(image_meta['extraction_time_seconds'], 2)
            }
        except Exception as e:
            print(f"⚠️ Could not load image metadata: {e}")
    
    return stats
