from sqlalchemy import desc
from sqlalchemy.orm import Session
from datetime import time,datetime
from zoneinfo import ZoneInfo

from .models import EntryLog,Student,AppSetting

IST = ZoneInfo("Asia/Kolkata")
def get_current_ist_time():
    return datetime.now(IST)

def process_scan(
    db: Session,
    student_id: str,
    approve_early_exit:bool = False
):
    setting = (
    db.query(AppSetting)
    .filter(
        AppSetting.key == "exit_allowed_time"
    )
    .first()
    )

    if setting is None:
        exit_allowed_time = time(16, 0)
    else:
        hours, minutes = map(
            int,
            setting.value.split(":")
        )

    exit_allowed_time = time(
        hours,
        minutes
    )


    # Find the student
    student = (
        db.query(Student)
        .filter(Student.student_id == student_id)
        .first()
    )

    if student is None:
        return None

    # Find the student's most recent scan
    last_log = (
        db.query(EntryLog)
        .filter(EntryLog.student_id == student_id)
        .order_by(desc(EntryLog.timestamp))
        .first()
    )

    # Automatically alternate between entry and exit
    if last_log is None or last_log.status == "exit":
        status = "entry"
    else:
        status = "exit"

        current_time = get_current_ist_time()

        if current_time.time() < exit_allowed_time:
            if not approve_early_exit:
                return {
                    "status": "approval_required",
                    "student_id": student.student_id,
                    "name": student.name,
                    "course": student.course,
                    "year": student.year,
                    "allowed_exit_time":
                        exit_allowed_time.strftime("%H:%M"),
                }
    timestamp = get_current_ist_time().replace(tzinfo=None)
    # Create new log
    log = EntryLog(
        student_id=student.student_id,
        student_name=student.name,
        course=student.course,
        year=student.year,
        status=status,
        timestamp=timestamp
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "status": "recorded",
        "student_id": log.student_id,
        "name": log.student_name,
        "course": log.course,
        "year": log.year,
        "scan_status": log.status,
        "timestamp": log.timestamp,
    }