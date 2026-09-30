from sqlalchemy import desc
from sqlalchemy.orm import Session

from .models import EntryLog,Student


def process_scan(
    db: Session,
    student_id: str,
):
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

    # Create new log
    log = EntryLog(
        student_id=student.student_id,
        student_name=student.name,
        course=student.course,
        year=student.year,
        status=status,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log