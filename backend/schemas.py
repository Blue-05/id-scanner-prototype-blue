from datetime import datetime

from pydantic import BaseModel


class ScanRequest(BaseModel):
    student_id: str
    approve_early_exit: bool = False


class ScanResponse(BaseModel):
    status: str
    student_id: str | None = None
    name: str | None = None
    course: str | None = None
    year: int | None = None
    scan_status: str | None = None
    timestamp: datetime | None = None
    allowed_exit_time: str | None = None
    
class ExitTimeRequest(BaseModel):
    exit_time:str

class ExitTimeResponse(BaseModel):
    exit_time:str