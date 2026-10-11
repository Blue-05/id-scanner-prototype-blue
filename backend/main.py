from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .models import AppSetting
from .database import Base, engine, get_db
from .schemas import ScanRequest, ScanResponse, ExitTimeRequest, ExitTimeResponse
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
        "https://id-scanner-prototype.netlify.app",
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
        db=db,
        student_id=request.student_id,
        approve_early_exit=request.approve_early_exit
    )

    if log["status"] == "not_found":
        raise HTTPException(
            status_code=404,
            detail="Student ID not found",
        )

    return log

@app.post("/api/settings/exit-time",response_model=ExitTimeResponse)
def set_exit_time(request:ExitTimeRequest,db: Session = Depends(get_db)):
    setting = (
        db.query(AppSetting)
        .filter(AppSetting.key == "exit_allowed_time")
        .first()
    )

    if setting is None:
        setting = AppSetting(
            key="exit_allowed_time",
            value=request.exit_time,
        )
        db.add(setting)
    else:
        setting.value = request.exit_time

    db.commit()

    return {
        "exit_time": setting.value
    }