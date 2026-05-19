from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from .models import (
    get_db, DailyPlan, JobApplication, StudyLog, MockInterview,
    ProjectMilestone, QuestionBank, Offer, Reminder, TargetCompany
)
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import date, timedelta, datetime
from sqlalchemy import func
router = APIRouter()

# ============================================================
# Pydantic Schemas
# ============================================================

# --- DailyPlan ---
class DailyPlanCreate(BaseModel):
    day: int
    date: date
    week: str
    focus_area: str
    tasks: str
    hours_planned: float
    status: str
    hours_actual: Optional[float] = None
    notes: Optional[str] = None
    ai_guide: Optional[str] = None

class DailyPlanOut(DailyPlanCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DailyPlanBulkCreate(BaseModel):
    plans: List[DailyPlanCreate]
    clear_existing: bool = True


# --- JobApplication ---
class JobApplicationCreate(BaseModel):
    date_applied: date
    company: str
    role: str
    location: str
    source: str
    job_link: Optional[str] = None
    referral: Optional[str] = None
    status: str
    recruiter_contact: Optional[str] = None
    next_step: Optional[str] = None
    next_step_date: Optional[date] = None
    notes: Optional[str] = None

class JobApplicationOut(JobApplicationCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- StudyLog ---
class StudyLogCreate(BaseModel):
    date: date
    topic: str
    subtopic: Optional[str] = None
    hours: Optional[float] = None
    confidence: Optional[int] = None
    sql_solved: Optional[int] = None
    pyspark_solved: Optional[int] = None
    resources: Optional[str] = None
    notes: Optional[str] = None

class StudyLogOut(StudyLogCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- MockInterview ---
class MockInterviewCreate(BaseModel):
    date: date
    type: str
    platform: Optional[str] = None
    score: Optional[int] = None
    strengths: Optional[str] = None
    weak_areas: Optional[str] = None
    action_items: Optional[str] = None

class MockInterviewOut(MockInterviewCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- ProjectMilestone ---
class ProjectMilestoneCreate(BaseModel):
    project: str
    milestone: str
    owner: Optional[str] = None
    due_date: Optional[date] = None
    status: str
    github_url: Optional[str] = None
    notes: Optional[str] = None

class ProjectMilestoneOut(ProjectMilestoneCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- QuestionBank ---
class QuestionBankCreate(BaseModel):
    topic: str
    question: str
    difficulty: str
    answer: Optional[str] = None
    confidence: Optional[int] = None
    last_revised: Optional[date] = None

class QuestionBankOut(QuestionBankCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Offer ---
class OfferCreate(BaseModel):
    company: str
    role: str
    ctc: float
    base: float
    bonus: float
    stocks: float
    benefits: Optional[str] = None
    notes: Optional[str] = None
    status: str

class OfferOut(OfferCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Reminder ---
class ReminderCreate(BaseModel):
    title: str
    due_date: date
    completed: Optional[bool] = False
    notes: Optional[str] = None

class ReminderOut(ReminderCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- TargetCompany ---
class TargetCompanyCreate(BaseModel):
    company: str
    tier: Optional[str] = None
    role: Optional[str] = None
    why_it_fits: Optional[str] = None
    referral_contact: Optional[str] = None
    status: Optional[str] = None

class TargetCompanyOut(TargetCompanyCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# CRUD Endpoints — DailyPlan
# ============================================================
@router.post("/dailyplan/", response_model=DailyPlanOut)
def create_daily_plan(plan: DailyPlanCreate, db: Session = Depends(get_db)):
    db_plan = DailyPlan(**plan.model_dump())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.post("/dailyplan/bulk")
def bulk_create_daily_plans(payload: DailyPlanBulkCreate, db: Session = Depends(get_db)):
    if payload.clear_existing:
        db.query(DailyPlan).delete()
    for plan in payload.plans:
        db_plan = DailyPlan(**plan.model_dump())
        db.add(db_plan)
    db.commit()
    return {"ok": True, "count": len(payload.plans)}

@router.get("/dailyplan/", response_model=List[DailyPlanOut])
def get_daily_plans(db: Session = Depends(get_db)):
    return db.query(DailyPlan).all()

@router.get("/dailyplan/{plan_id}", response_model=DailyPlanOut)
def get_daily_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(DailyPlan).filter(DailyPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@router.put("/dailyplan/{plan_id}", response_model=DailyPlanOut)
def update_daily_plan(plan_id: int, plan: DailyPlanCreate, db: Session = Depends(get_db)):
    db_plan = db.query(DailyPlan).filter(DailyPlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for k, v in plan.model_dump().items():
        setattr(db_plan, k, v)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.delete("/dailyplan/{plan_id}")
def delete_daily_plan(plan_id: int, db: Session = Depends(get_db)):
    db_plan = db.query(DailyPlan).filter(DailyPlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(db_plan)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — JobApplication
# ============================================================
@router.post("/jobapps/", response_model=JobApplicationOut)
def create_job_app(app: JobApplicationCreate, db: Session = Depends(get_db)):
    db_app = JobApplication(**app.model_dump())
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.get("/jobapps/", response_model=List[JobApplicationOut])
def get_job_apps(db: Session = Depends(get_db)):
    return db.query(JobApplication).all()

@router.get("/jobapps/{app_id}", response_model=JobApplicationOut)
def get_job_app(app_id: int, db: Session = Depends(get_db)):
    app = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app

@router.put("/jobapps/{app_id}", response_model=JobApplicationOut)
def update_job_app(app_id: int, app: JobApplicationCreate, db: Session = Depends(get_db)):
    db_app = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    for k, v in app.model_dump().items():
        setattr(db_app, k, v)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.delete("/jobapps/{app_id}")
def delete_job_app(app_id: int, db: Session = Depends(get_db)):
    db_app = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(db_app)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — StudyLog
# ============================================================
@router.post("/studylogs/", response_model=StudyLogOut)
def create_study_log(log: StudyLogCreate, db: Session = Depends(get_db)):
    db_log = StudyLog(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/studylogs/", response_model=List[StudyLogOut])
def get_study_logs(db: Session = Depends(get_db)):
    return db.query(StudyLog).all()

@router.get("/studylogs/{log_id}", response_model=StudyLogOut)
def get_study_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(StudyLog).filter(StudyLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Study log not found")
    return log

@router.put("/studylogs/{log_id}", response_model=StudyLogOut)
def update_study_log(log_id: int, log: StudyLogCreate, db: Session = Depends(get_db)):
    db_log = db.query(StudyLog).filter(StudyLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Study log not found")
    for k, v in log.model_dump().items():
        setattr(db_log, k, v)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.delete("/studylogs/{log_id}")
def delete_study_log(log_id: int, db: Session = Depends(get_db)):
    db_log = db.query(StudyLog).filter(StudyLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Study log not found")
    db.delete(db_log)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — MockInterview
# ============================================================
@router.post("/mockinterviews/", response_model=MockInterviewOut)
def create_mock_interview(interview: MockInterviewCreate, db: Session = Depends(get_db)):
    db_interview = MockInterview(**interview.model_dump())
    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)
    return db_interview

@router.get("/mockinterviews/", response_model=List[MockInterviewOut])
def get_mock_interviews(db: Session = Depends(get_db)):
    return db.query(MockInterview).all()

@router.get("/mockinterviews/{interview_id}", response_model=MockInterviewOut)
def get_mock_interview(interview_id: int, db: Session = Depends(get_db)):
    interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Mock interview not found")
    return interview

@router.put("/mockinterviews/{interview_id}", response_model=MockInterviewOut)
def update_mock_interview(interview_id: int, interview: MockInterviewCreate, db: Session = Depends(get_db)):
    db_interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    if not db_interview:
        raise HTTPException(status_code=404, detail="Mock interview not found")
    for k, v in interview.model_dump().items():
        setattr(db_interview, k, v)
    db.commit()
    db.refresh(db_interview)
    return db_interview

@router.delete("/mockinterviews/{interview_id}")
def delete_mock_interview(interview_id: int, db: Session = Depends(get_db)):
    db_interview = db.query(MockInterview).filter(MockInterview.id == interview_id).first()
    if not db_interview:
        raise HTTPException(status_code=404, detail="Mock interview not found")
    db.delete(db_interview)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — ProjectMilestone
# ============================================================
@router.post("/milestones/", response_model=ProjectMilestoneOut)
def create_milestone(milestone: ProjectMilestoneCreate, db: Session = Depends(get_db)):
    db_milestone = ProjectMilestone(**milestone.model_dump())
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone

@router.get("/milestones/", response_model=List[ProjectMilestoneOut])
def get_milestones(db: Session = Depends(get_db)):
    return db.query(ProjectMilestone).all()

@router.get("/milestones/{milestone_id}", response_model=ProjectMilestoneOut)
def get_milestone(milestone_id: int, db: Session = Depends(get_db)):
    milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return milestone

@router.put("/milestones/{milestone_id}", response_model=ProjectMilestoneOut)
def update_milestone(milestone_id: int, milestone: ProjectMilestoneCreate, db: Session = Depends(get_db)):
    db_milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id).first()
    if not db_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for k, v in milestone.model_dump().items():
        setattr(db_milestone, k, v)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone

@router.delete("/milestones/{milestone_id}")
def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    db_milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id).first()
    if not db_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    db.delete(db_milestone)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — QuestionBank
# ============================================================
@router.post("/questions/", response_model=QuestionBankOut)
def create_question(question: QuestionBankCreate, db: Session = Depends(get_db)):
    db_question = QuestionBank(**question.model_dump())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@router.get("/questions/", response_model=List[QuestionBankOut])
def get_questions(db: Session = Depends(get_db)):
    return db.query(QuestionBank).all()

@router.get("/questions/{question_id}", response_model=QuestionBankOut)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.put("/questions/{question_id}", response_model=QuestionBankOut)
def update_question(question_id: int, question: QuestionBankCreate, db: Session = Depends(get_db)):
    db_question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    for k, v in question.model_dump().items():
        setattr(db_question, k, v)
    db.commit()
    db.refresh(db_question)
    return db_question

@router.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    db_question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(db_question)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — Offer
# ============================================================
@router.post("/offers/", response_model=OfferOut)
def create_offer(offer: OfferCreate, db: Session = Depends(get_db)):
    db_offer = Offer(**offer.model_dump())
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.get("/offers/", response_model=List[OfferOut])
def get_offers(db: Session = Depends(get_db)):
    return db.query(Offer).all()

@router.get("/offers/{offer_id}", response_model=OfferOut)
def get_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer

@router.put("/offers/{offer_id}", response_model=OfferOut)
def update_offer(offer_id: int, offer: OfferCreate, db: Session = Depends(get_db)):
    db_offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    for k, v in offer.model_dump().items():
        setattr(db_offer, k, v)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.delete("/offers/{offer_id}")
def delete_offer(offer_id: int, db: Session = Depends(get_db)):
    db_offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    db.delete(db_offer)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — Reminder
# ============================================================
@router.post("/reminders/", response_model=ReminderOut)
def create_reminder(reminder: ReminderCreate, db: Session = Depends(get_db)):
    db_reminder = Reminder(**reminder.model_dump())
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.get("/reminders/", response_model=List[ReminderOut])
def get_reminders(db: Session = Depends(get_db)):
    return db.query(Reminder).all()

@router.get("/reminders/{reminder_id}", response_model=ReminderOut)
def get_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder

@router.put("/reminders/{reminder_id}", response_model=ReminderOut)
def update_reminder(reminder_id: int, reminder: ReminderCreate, db: Session = Depends(get_db)):
    db_reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    for k, v in reminder.model_dump().items():
        setattr(db_reminder, k, v)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    db_reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(db_reminder)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — TargetCompany
# ============================================================
@router.post("/targetcompanies/", response_model=TargetCompanyOut)
def create_target_company(tc: TargetCompanyCreate, db: Session = Depends(get_db)):
    db_tc = TargetCompany(**tc.model_dump())
    db.add(db_tc)
    db.commit()
    db.refresh(db_tc)
    return db_tc

@router.get("/targetcompanies/", response_model=List[TargetCompanyOut])
def get_target_companies(db: Session = Depends(get_db)):
    return db.query(TargetCompany).all()

@router.get("/targetcompanies/{tc_id}", response_model=TargetCompanyOut)
def get_target_company(tc_id: int, db: Session = Depends(get_db)):
    tc = db.query(TargetCompany).filter(TargetCompany.id == tc_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Target company not found")
    return tc

@router.put("/targetcompanies/{tc_id}", response_model=TargetCompanyOut)
def update_target_company(tc_id: int, tc: TargetCompanyCreate, db: Session = Depends(get_db)):
    db_tc = db.query(TargetCompany).filter(TargetCompany.id == tc_id).first()
    if not db_tc:
        raise HTTPException(status_code=404, detail="Target company not found")
    for k, v in tc.model_dump().items():
        setattr(db_tc, k, v)
    db.commit()
    db.refresh(db_tc)
    return db_tc

@router.delete("/targetcompanies/{tc_id}")
def delete_target_company(tc_id: int, db: Session = Depends(get_db)):
    db_tc = db.query(TargetCompany).filter(TargetCompany.id == tc_id).first()
    if not db_tc:
        raise HTTPException(status_code=404, detail="Target company not found")
    db.delete(db_tc)
    db.commit()
    return {"ok": True}


# ============================================================
# Analytics Endpoint
# ============================================================
@router.get("/analytics/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    today = date.today()
    
    # 1. Total Counts
    total_plans = db.query(DailyPlan).count()
    completed_plans = db.query(DailyPlan).filter(
        DailyPlan.status.ilike("%done%") | DailyPlan.status.ilike("%complete%")
    ).count()
    
    total_questions = db.query(QuestionBank).count()
    total_milestones = db.query(ProjectMilestone).count()
    completed_milestones = db.query(ProjectMilestone).filter(
        ProjectMilestone.status.ilike("%done%") | ProjectMilestone.status.ilike("%complete%")
    ).count()
    
    total_targets = db.query(TargetCompany).count()
    total_apps = db.query(JobApplication).count()
    total_mocks = db.query(MockInterview).count()
    
    # 2. Upcoming Daily Plans (Next 5 not done)
    upcoming_plans = db.query(DailyPlan).filter(
        DailyPlan.date >= today,
        ~DailyPlan.status.ilike("%done%")
    ).order_by(DailyPlan.date.asc()).limit(5).all()
    
    # 3. Questions by Topic
    questions_by_topic = db.query(
        QuestionBank.topic, func.count(QuestionBank.id)
    ).group_by(QuestionBank.topic).all()
    
    # 4. Job App Pipeline (Statuses)
    app_pipeline = db.query(
        JobApplication.status, func.count(JobApplication.id)
    ).group_by(JobApplication.status).all()
    
    # 5. Study Hours (Last 8 Weeks)
    eight_weeks_ago = today - timedelta(days=56)
    study_logs = db.query(StudyLog).filter(StudyLog.date >= eight_weeks_ago).all()
    # Group in python for simplicity
    study_by_week = {}
    for log in study_logs:
        if not log.date or not log.hours:
            continue
        # Get start of week (Monday)
        week_start = log.date - timedelta(days=log.date.weekday())
        week_str = week_start.strftime("%Y-%m-%d")
        study_by_week[week_str] = study_by_week.get(week_str, 0) + log.hours
    
    # 6. Upcoming Reminders
    upcoming_reminders = db.query(Reminder).filter(
        Reminder.completed == False
    ).order_by(Reminder.due_date.asc()).limit(10).all()
    
    # 7. Recent Activity (Latest 5 Study Logs)
    recent_activity = []
    recent_logs = db.query(StudyLog).order_by(StudyLog.date.desc()).limit(5).all()
    for log in recent_logs:
        recent_activity.append({
            "type": "study",
            "date": log.date.isoformat() if log.date else None,
            "title": f"Studied {log.topic}",
            "desc": f"{log.hours} hours"
        })
    
    # 8. Study Streak
    # Calculate consecutive days with a study log ending near today
    all_dates = db.query(StudyLog.date).distinct().order_by(StudyLog.date.desc()).all()
    date_set = {d[0] for d in all_dates if d[0]}
    
    current_streak = 0
    check_date = today
    if check_date not in date_set:
        check_date = today - timedelta(days=1)
    
    while check_date in date_set:
        current_streak += 1
        check_date -= timedelta(days=1)
        
    return {
        "counts": {
            "total_plans": total_plans,
            "completed_plans": completed_plans,
            "total_questions": total_questions,
            "total_milestones": total_milestones,
            "completed_milestones": completed_milestones,
            "total_targets": total_targets,
            "total_apps": total_apps,
            "total_mocks": total_mocks
        },
        "upcoming_plans": [
            {"date": p.date.isoformat() if p.date else None, "focus_area": p.focus_area, "status": p.status} 
            for p in upcoming_plans
        ],
        "questions_by_topic": [{"topic": row[0], "count": row[1]} for row in questions_by_topic],
        "app_pipeline": [{"status": row[0], "count": row[1]} for row in app_pipeline],
        "study_by_week": study_by_week,
        "upcoming_reminders": [
            {"id": r.id, "title": r.title, "due_date": r.due_date.isoformat() if r.due_date else None, "completed": r.completed} 
            for r in upcoming_reminders
        ],
        "recent_activity": recent_activity,
        "current_streak": current_streak
    }


# ============================================================
# Backup & Export Endpoint
# ============================================================
@router.get("/export/csv")
def export_db_to_csv_zip(db: Session = Depends(get_db)):
    import csv
    import io
    import zipfile
    from fastapi.responses import StreamingResponse
    
    def to_csv_bytes(records, fields):
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(fields)
        for record in records:
            row = []
            for field in fields:
                val = getattr(record, field, None)
                if isinstance(val, (date, datetime)):
                    row.append(val.isoformat())
                else:
                    row.append(str(val) if val is not None else "")
            writer.writerow(row)
        return output.getvalue().encode('utf-8')

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # 1. Daily plans
        zip_file.writestr("daily_plans.csv", to_csv_bytes(db.query(DailyPlan).all(), [
            "id", "day", "date", "week", "focus_area", "tasks", "hours_planned", "status", "hours_actual", "notes", "ai_guide"
        ]))
        # 2. Job applications
        zip_file.writestr("job_applications.csv", to_csv_bytes(db.query(JobApplication).all(), [
            "id", "date_applied", "company", "role", "location", "source", "job_link", "referral", "status", "recruiter_contact", "next_step", "next_step_date", "notes"
        ]))
        # 3. Study logs
        zip_file.writestr("study_logs.csv", to_csv_bytes(db.query(StudyLog).all(), [
            "id", "date", "topic", "subtopic", "hours", "confidence", "sql_solved", "pyspark_solved", "resources", "notes"
        ]))
        # 4. Mock interviews
        zip_file.writestr("mock_interviews.csv", to_csv_bytes(db.query(MockInterview).all(), [
            "id", "date", "type", "platform", "score", "strengths", "weak_areas", "action_items"
        ]))
        # 5. Project milestones
        zip_file.writestr("project_milestones.csv", to_csv_bytes(db.query(ProjectMilestone).all(), [
            "id", "project", "milestone", "owner", "due_date", "status", "github_url", "notes"
        ]))
        # 6. Question bank
        zip_file.writestr("question_bank.csv", to_csv_bytes(db.query(QuestionBank).all(), [
            "id", "topic", "question", "difficulty", "answer", "confidence", "last_revised"
        ]))
        # 7. Offers
        zip_file.writestr("offers.csv", to_csv_bytes(db.query(Offer).all(), [
            "id", "company", "role", "ctc", "base", "bonus", "stocks", "benefits", "notes", "status"
        ]))
        # 8. Reminders
        zip_file.writestr("reminders.csv", to_csv_bytes(db.query(Reminder).all(), [
            "id", "title", "due_date", "completed", "notes"
        ]))
        # 9. Target companies
        zip_file.writestr("target_companies.csv", to_csv_bytes(db.query(TargetCompany).all(), [
            "id", "company", "tier", "role", "why_it_fits", "referral_contact", "status"
        ]))
        
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=progress_tracker_export.zip"}
    )


@router.get("/youtube/search")
def search_youtube_video(q: str):
    import urllib.request
    import urllib.parse
    import re
    try:
        # Encode search query
        query = urllib.parse.quote(q)
        url = f"https://www.youtube.com/results?search_query={query}"
        
        # Make request with a standard user-agent to avoid blocks
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'}
        )
        
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8')
            
        # Search for videoIds
        video_ids = re.findall(r"\"videoId\":\"([^\"]+)\"", html)
        if video_ids:
            unique_ids = []
            for v_id in video_ids:
                if v_id not in unique_ids and len(v_id) == 11:
                    unique_ids.append(v_id)
            if unique_ids:
                return {"videoId": unique_ids[0]}
    except Exception as e:
        print("YouTube scrape error:", e)
    return {"videoId": None}

