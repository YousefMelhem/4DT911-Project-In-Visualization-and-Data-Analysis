from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json
from typing import List, Optional
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
IMAGES_DIR = DATA_DIR / "archive" / "medpix_data_final" 

# Mount static files for images
app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

# Include routers
app.include_router(similarity_router, prefix="/api/similarity", tags=["similarity"])

# Load processed cases
CASES_FILE = ML_Ready_DIR / "cases_ml_ready.json"
SUMMARY_FILE = PROCESSED_DIR / "cases_summary.json"
METADATA_FILE = PROCESSED_DIR / "cases_metadata.json"

# Cache for cases data
cases_data = []
summary_data = []
cases_metadata = []
def load_data():
    """Load case data on startup"""
    global cases_data, summary_data, cases_metadata

    try:
        with open(CASES_FILE, 'r', encoding='utf-8') as f:
            cases_data = json.load(f)
        print(f"✅ Loaded {len(cases_data)} cases")
    except Exception as e:
        print(f"⚠️ Error loading cases: {e}")
        cases_data = []
    
    try:
        with open(SUMMARY_FILE, 'r', encoding='utf-8') as f:
            summary_data = json.load(f)
        print(f"✅ Loaded {len(summary_data)} case summaries")
    except Exception as e:
        print(f"⚠️ Error loading summaries: {e}")
        summary_data = []
    
    try:
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            cases_metadata = json.load(f)
        print(f"✅ Loaded {len(cases_metadata)} metadata records")
    except Exception as e:
        print(f"⚠️ Error loading metadata: {e}")
        cases_metadata = []

# Pydantic models
class CaseSummary(BaseModel):
    id: str
    title:str
    diagnosis: Optional[str]= None
    imageCount: int
    patient_age: Optional[str] = None
    gender: Optional[str] = None
    modality_guess: Optional[str] = None
    body_region: Optional[str] = None
    thumbnail: Optional[str]=None
    url: Optional[str]=None

class CaseDetail(BaseModel):
    id: str
    url: Optional[str]= None
    patient_age: Optional[str] = None
    gender: Optional[str] = None
    modality_guess: Optional[str] = None
    body_region: Optional[str] = None
    diagnosis: Optional[str] = None
    title: Optional[str] = None
    history: Optional[str] = None
    exam: Optional[str] = None
    findings: Optional[str] = None
    caseDiagnosis: Optional[str] = None
    treatment: Optional[str] = None
    discussion: Optional[str] = None
    differentialDiagnosis: Optional[str] = None
    imageCount: int = 0
    imagePaths: List[str] = []
    caseFolder: Optional[str] = None
    thumbnail: Optional[str] = None

class CaseMetadata(BaseModel):
    case_id: str
    added_on: Optional[str]
    last_edited_on: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    modalities: List[str]
    regions: List[str]
    image_count: int
    word_count: int

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

@app.get("/api/cases/metadata", response_model=List[CaseMetadata])
async def get_all_cases_metadata():
    """Return all case metadata (for analytics)."""
    if not cases_metadata:
        raise HTTPException(status_code=500, detail="No metadata available")
    
    return cases_metadata

@app.get("/api/cases/{case_id}/metadata", response_model=CaseMetadata)
async def get_metadata(case_id: str):
    """Return metadata for a single case."""
    if not cases_metadata:
        raise HTTPException(status_code=500, detail="No metadata available")
    
    rec = next((m for m in cases_metadata if m.get("case_id") == case_id), None)

    if not rec:
        raise HTTPException(status_code=404, detail=f"Metadata for case {case_id} not found")
    
    return rec

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
