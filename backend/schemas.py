from datetime import datetime

from pydantic import BaseModel


class ScanRequest(BaseModel):
    student_id: str


class ScanResponse(BaseModel):
    success: bool
    student_id: str
    name: str
    course: str
    year: int
    status: str
    timestamp: datetime