from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .schemas import ScanRequest, ScanResponse
from .scanner import process_scan


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="College ID Scanner",
    description="QR-based college entry/exit scanner",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://id-scanner-prototype.netlify.app/",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static",
)



@app.get("/")
def frontend():
    return FileResponse(FRONTEND_DIR/"index.html")


@app.post(
    "/api/scan",
    response_model=ScanResponse,
)
def scan(
    request: ScanRequest,
    db: Session = Depends(get_db),
):
    log = process_scan(
        db,
        request.student_id,
    )

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="Student ID not found",
        )

    return {
        "success": True,
        "student_id": log.student_id,
        "name": log.student_name,
        "course": log.course,
        "year": log.year,
        "status": log.status,
        "timestamp": log.timestamp,
    }