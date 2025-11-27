from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json
from typing import List, Optional, Dict
from pydantic import BaseModel
from contextlib import asynccontextmanager

# Import similarity API
from api.similarity import router as similarity_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load data when server starts
    load_data()
    yield
    # Shutdown: cleanup if needed
    pass

app = FastAPI(title="MedPix Explorer API", version="1.0.0", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"
ML_Ready_DIR = DATA_DIR / "ml_ready"
FEATURES_DIR = DATA_DIR / "features"
IMAGES_DIR = DATA_DIR / "archive" / "medpix_data_final" 

# Mount static files for images and ML features
app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")
app.mount("/data/features", StaticFiles(directory=str(FEATURES_DIR)), name="features")

# Include routers
app.include_router(similarity_router, prefix="/api/similarity", tags=["similarity"])

# Load processed cases
CASES_FILE = PROCESSED_DIR / "cases_cleaned_v2.json"
SUMMARY_FILE = PROCESSED_DIR / "cases_summary_v2.json"

# Cache for cases data
cases_data = []
summary_data = []
def load_data():
    """Load case data on startup"""
    global cases_data, summary_data

    try:
        with open(CASES_FILE, 'r', encoding='utf-8') as f:
            cases_data = json.load(f)
        print(f"Loaded {len(cases_data)} cases")
    except Exception as e:
        print(f"Error loading cases: {e}")
        cases_data = []
    
    try:
        with open(SUMMARY_FILE, 'r', encoding='utf-8') as f:
            summary_data = json.load(f)
        print(f"Loaded {len(summary_data)} case summaries")
    except Exception as e:
        print(f"Error loading summaries: {e}")
        summary_data = []

# Pydantic models
class CaseSummary(BaseModel):
    id: str
    title:str
    diagnosis: Optional[str]= None
    imageCount: int
    patient_age: Optional[int] = None
    gender: Optional[str] = None
    modalities: List[str]
    regions: Dict[str, List[str]]
    added_on: Optional[str] = None
    last_edited_on: Optional[str] = None
    word_count: int
    thumbnail: Optional[str]=None
    url: Optional[str]=None
    has_history: bool
    has_exam: bool
    has_findings: bool
    has_diagnosis: bool
    has_treatment: bool
    has_discussion: bool
    image_cluster_id: Optional[int] = None
    image_cluster_label: Optional[str] = None

class CaseDetail(BaseModel):
    id: str
    url: Optional[str]= None
    patient_age: Optional[int] = None
    gender: Optional[str] = None
    modalities: List[str]
    regions: Dict[str, List[str]]
    diagnosis: Optional[str] = None
    title: Optional[str] = None
    history: Optional[str] = None
    exam: Optional[str] = None
    findings: Optional[str] = None
    caseDiagnosis: Optional[str] = None
    treatment: Optional[str] = None
    discussion: Optional[str] = None
    differentialDiagnosis: Optional[str] = None
    added_on: Optional[str] = None
    last_edited_on: Optional[str] = None
    word_count: int
    imageCount: int = 0
    imagePaths: List[str] = []
    caseFolder: Optional[str] = None
    thumbnail: Optional[str] = None
    image_cluster_id: Optional[int] = None
    image_cluster_label: Optional[str] = None

# API Endpoints
@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "MedPix Explorer API",
        "version": "1.0.0",
        "total_cases": len(cases_data)
    }

@app.get("/api/cases/summary", response_model=List[CaseSummary], response_model_exclude_none=True)
async def get_cases_summary(
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
):
    """Get paginated case summaries for gallery view"""
    if not summary_data:
        raise HTTPException(status_code=500, detail="No case data available")
    
    end = offset + limit
    return summary_data[offset:end]

@app.get("/api/cases/summary_all", response_model=List[CaseSummary], response_model_exclude_none=True)
async def get_cases_summary_all():
    """Get all case summaries for analytics dashboard"""
    if not summary_data:
        raise HTTPException(status_code=500, detail="No case data available")

    return summary_data

@app.get("/api/cases/cluster-representatives")
async def get_cluster_representatives():
    """Get one representative case from each diagnosis cluster"""
    try:
        # Load cluster data
        cluster_file = FEATURES_DIR / "diagnosis_biobert_clusters.json"
        if not cluster_file.exists():
            raise HTTPException(status_code=404, detail="Cluster data not found")
        
        with open(cluster_file, 'r') as f:
            cluster_data = json.load(f)
        
        # Load cluster labels
        labels_file = FEATURES_DIR / "cluster_labels.json"
        cluster_labels = {}
        cluster_descriptions = {}
        if labels_file.exists():
            with open(labels_file, 'r') as f:
                labels_data = json.load(f)
                cluster_labels = labels_data.get('cluster_labels', {})
                cluster_descriptions = labels_data.get('cluster_descriptions', {})
        
        # Get diagnoses and their clusters
        diagnoses = cluster_data.get('diagnoses', [])
        clusters = cluster_data.get('clusters', [])
        frequencies = cluster_data.get('frequencies', cluster_data.get('frequency', []))
        
        # Find the most frequent diagnosis for each cluster (0-24)
        cluster_representatives = {}
        for cluster_id in range(25):
            best_diagnosis = None
            best_frequency = 0
            
            for i, (diagnosis, cluster, freq) in enumerate(zip(diagnoses, clusters, frequencies)):
                if cluster == cluster_id and freq > best_frequency:
                    best_diagnosis = diagnosis
                    best_frequency = freq
            
            if best_diagnosis:
                # Find a case with this diagnosis
                case = next((c for c in summary_data if c.get('diagnosis') == best_diagnosis), None)
                if case:
                    cluster_representatives[str(cluster_id)] = {
                        "cluster_id": cluster_id,
                        "cluster_label": cluster_labels.get(str(cluster_id), f"Cluster {cluster_id}"),
                        "cluster_description": cluster_descriptions.get(str(cluster_id), ""),
                        "case": case
                    }
        
        return cluster_representatives
    
    except Exception as e:
        print(f"Error loading cluster representatives: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cases/{case_id}", response_model=CaseDetail)
async def get_case_detail(case_id: str):
    """Get detailed information for a specific case"""
    if not cases_data:
        raise HTTPException(status_code=500, detail="No case data available")
    
    # Find case by ID
    case = next((c for c in cases_data if c['id'] == case_id), None)
    
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    return case

@app.get("/api/cases/search")
async def search_cases(
    q: Optional[str] = None,
    limit: Optional[int] = 50
):
    """Search cases by diagnosis or keywords"""
    if not summary_data:
        raise HTTPException(status_code=500, detail="No case data available")
    
    if not q:
        return summary_data[:limit]
    
    # Simple text search in diagnosis
    query = q.lower()
    results = [
        case for case in summary_data
        if query in case.get('diagnosis', '').lower()
    ]
    
    return results[:limit]

@app.get("/api/stats")
async def get_statistics():
    """Get dataset statistics"""
    if not cases_data:
        raise HTTPException(status_code=500, detail="No case data available")
    
    total_images = sum(case.get('imageCount', 0) for case in cases_data)
    
    return {
        "total_cases": len(cases_data),
        "total_images": total_images,
        "avg_images_per_case": total_images / len(cases_data) if cases_data else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
