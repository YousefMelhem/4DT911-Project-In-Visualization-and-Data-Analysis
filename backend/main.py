from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json
from typing import List, Optional
from pydantic import BaseModel
from contextlib import asynccontextmanager

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
IMAGES_DIR = DATA_DIR / "archive" / "medpix_data_final"

# Mount static files for images
app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

# Load processed cases
CASES_FILE = PROCESSED_DIR / "cases_cleaned.json"
SUMMARY_FILE = PROCESSED_DIR / "cases_summary.json"

# Cache for cases data
cases_data = []
summary_data = []

def load_data():
    """Load case data on startup"""
    global cases_data, summary_data
    
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

# Pydantic models
class CaseSummary(BaseModel):
    id: str
    diagnosis: str
    imageCount: int
    thumbnail: Optional[str]
    url: str

class CaseDetail(BaseModel):
    id: str
    url: str
    diagnosis: str
    caseTitle: str
    history: str
    exam: str
    findings: str
    caseDiagnosis: str
    treatment: str
    discussion: str
    differentialDiagnosis: str
    imageCount: int
    imagePaths: List[str]
    caseFolder: str

# API Endpoints
@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "MedPix Explorer API",
        "version": "1.0.0",
        "total_cases": len(cases_data)
    }

@app.get("/api/cases/summary", response_model=List[CaseSummary])
async def get_cases_summary(
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
):
    """Get paginated case summaries for gallery view"""
    if not summary_data:
        raise HTTPException(status_code=500, detail="No case data available")
    
    end = offset + limit
    return summary_data[offset:end]

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
