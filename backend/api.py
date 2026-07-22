from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from models import (
    get_db, DailyPlan, JobApplication, StudyLog, MockInterview,
    ProjectMilestone, QuestionBank, Offer, Reminder, TargetCompany, Goal
)
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any
from datetime import date, timedelta, datetime
from sqlalchemy import func, or_
router = APIRouter()

from models import User
from auth import get_current_user, create_access_token, get_password_hash, verify_password
from fastapi.security import OAuth2PasswordRequestForm
import httpx



# ============================================================
# Authentication
# ============================================================
class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/auth/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Assign all unassigned records to this new user (migration)
    models = [DailyPlan, JobApplication, StudyLog, MockInterview, ProjectMilestone, QuestionBank, Offer, Reminder, TargetCompany]
    for model in models:
        db.query(model).filter(model.user_id.is_(None)).update({model.user_id: new_user.id})
    db.commit()
    
    return {"message": "User registered successfully"}

@router.post("/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


# ============================================================
# AI Proxy Endpoint
# ============================================================
class AIProxyRequest(BaseModel):
    gateway_url: str
    api_key: str
    model_name: str
    prompt: str
    history: List[Dict[str, str]] = []
    max_output_tokens: Optional[int] = None
    system_instruction: Optional[str] = None

@router.post("/ai/proxy")
async def ai_proxy(req: AIProxyRequest, current_user: User = Depends(get_current_user)):
    if not req.api_key:
        raise HTTPException(status_code=400, detail="API Key is missing")
    
    is_gemini = "generativelanguage.googleapis.com" in req.gateway_url
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            if is_gemini:
                base_url = req.gateway_url.rstrip('/')
                if not base_url.endswith("models"):
                    if base_url.endswith("v1beta"):
                        base_url += "/models"
                    else:
                        base_url += "/v1beta/models"
                url = f"{base_url}/{req.model_name}:generateContent?key={req.api_key}"
                headers = {"Content-Type": "application/json"}
                contents = []
                for msg in req.history:
                    contents.append({"role": "user" if msg["role"] == "user" else "model", "parts": [{"text": msg["content"]}]})
                contents.append({"role": "user", "parts": [{"text": req.prompt}]})
                payload = {"contents": contents}
                # Add generation config if max_output_tokens specified
                if req.max_output_tokens:
                    payload["generationConfig"] = {"maxOutputTokens": req.max_output_tokens, "temperature": 0.7}
                # Add system instruction if specified
                if req.system_instruction:
                    payload["system_instruction"] = {"parts": [{"text": req.system_instruction}]}
            else:
                if req.gateway_url.endswith("/chat/completions"):
                    url = req.gateway_url
                elif req.gateway_url.rstrip('/').endswith("/v1"):
                    url = f"{req.gateway_url.rstrip('/')}/chat/completions"
                else:
                    url = f"{req.gateway_url.rstrip('/')}/v1/chat/completions"
                headers = {"Content-Type": "application/json", "Authorization": f"Bearer {req.api_key}"}
                messages = []
                if req.system_instruction:
                    messages.append({"role": "system", "content": req.system_instruction})
                for msg in req.history:
                    messages.append({"role": "assistant" if msg["role"] == "model" else msg["role"], "content": msg["content"]})
                messages.append({"role": "user", "content": req.prompt})
                payload = {"model": req.model_name, "messages": messages, "temperature": 0.7}
                if req.max_output_tokens:
                    payload["max_tokens"] = req.max_output_tokens

            resp = await client.post(url, json=payload, headers=headers)
            
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Proxy to {url} failed with {resp.status_code}: {resp.text}")
                
            return resp.json()
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Proxy error ({url}): {str(e)}")

# ============================================================
# Pydantic Schemas
# ============================================================

# --- Goal ---
class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    status: str = "In Progress"
    progress: int = 0
    notes: Optional[str] = None

class GoalOut(GoalCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- DailyPlan ---
class DailyPlanCreate(BaseModel):
    track_name: str = "Default"
    day: int
    date: date
    week: str
    focus_area: str
    tasks: str
    hours_planned: float = Field(ge=0)
    status: str
    hours_actual: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None
    ai_guide: Optional[str] = None
    ai_quiz: Optional[str] = None
    quiz_scores: Optional[str] = None

class DailyPlanOut(DailyPlanCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DailyPlanBulkCreate(BaseModel):
    track_name: str = "Default"
    plans: List[DailyPlanCreate]
    merge_strategy: str = "clear_all" # "clear_all", "replace_future", "append", "merge"


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
    hours: Optional[float] = Field(default=None, ge=0)
    confidence: Optional[int] = Field(default=None, ge=0, le=100)
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
    score: Optional[int] = Field(default=None, ge=0, le=100)
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
    confidence: Optional[int] = Field(default=None, ge=0, le=100)
    last_revised: Optional[date] = None
    next_review_date: Optional[date] = None
    interval: Optional[int] = 0
    repetition: Optional[int] = 0
    easiness_factor: Optional[float] = 2.5

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
def create_daily_plan(plan: DailyPlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_plan = DailyPlan(**plan.model_dump(), user_id=current_user.id)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.post("/dailyplan/bulk")
def bulk_create_daily_plans(payload: DailyPlanBulkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today_date = date.today()
    offset_days = 0

    if payload.merge_strategy == "clear_all":
        db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id, DailyPlan.track_name == payload.track_name).delete()
    elif payload.merge_strategy == "replace_future":
        db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id, DailyPlan.track_name == payload.track_name, DailyPlan.date >= today_date).delete()
    elif payload.merge_strategy == "append":
        # Find the maximum date of existing plans
        max_date_res = db.query(func.max(DailyPlan.date)).filter(DailyPlan.user_id == current_user.id, DailyPlan.track_name == payload.track_name).scalar()
        if max_date_res and max_date_res >= today_date:
            # We want to start the new roadmap from max_date + 1
            # But the incoming plans are starting from `today_date`.
            # So offset = (max_date - today_date).days + 1
            offset_days = (max_date_res - today_date).days + 1
    # If "merge", we do nothing (no deletes, no offset)

    for plan in payload.plans:
        p_dict = plan.model_dump()
        if offset_days > 0 and isinstance(p_dict.get('date'), date):
            p_dict['date'] = p_dict['date'] + timedelta(days=offset_days)
        
        p_dict['track_name'] = payload.track_name
        db_plan = DailyPlan(**p_dict, user_id=current_user.id)
        db.add(db_plan)
        
    db.commit()
    return {"ok": True, "count": len(payload.plans)}

@router.get("/dailyplan/", response_model=List[DailyPlanOut])
def read_daily_plans(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plans = db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id).order_by(DailyPlan.day.asc()).offset(skip).limit(limit).all()
    return plans

@router.get("/dailyplan/{plan_id}", response_model=DailyPlanOut)
def get_daily_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id, DailyPlan.user_id == current_user.id).filter(DailyPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@router.put("/dailyplan/{plan_id}", response_model=DailyPlanOut)
def update_daily_plan(plan_id: int, plan: DailyPlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_plan = db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id, DailyPlan.user_id == current_user.id).filter(DailyPlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for k, v in plan.model_dump().items():
        setattr(db_plan, k, v)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.delete("/dailyplan/{plan_id}")
def delete_daily_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_plan = db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id, DailyPlan.user_id == current_user.id).filter(DailyPlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(db_plan)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — JobApplication
# ============================================================
@router.post("/jobapps/", response_model=JobApplicationOut)
def create_job_app(app: JobApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_app = JobApplication(**app.model_dump(), user_id=current_user.id)
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.get("/jobapps/", response_model=List[JobApplicationOut])
def get_job_apps(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(JobApplication).filter(JobApplication.user_id == current_user.id, JobApplication.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/jobapps/{app_id}", response_model=JobApplicationOut)
def get_job_app(app_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = db.query(JobApplication).filter(JobApplication.user_id == current_user.id, JobApplication.user_id == current_user.id).filter(JobApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app

@router.put("/jobapps/{app_id}", response_model=JobApplicationOut)
def update_job_app(app_id: int, app: JobApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_app = db.query(JobApplication).filter(JobApplication.user_id == current_user.id, JobApplication.user_id == current_user.id).filter(JobApplication.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    for k, v in app.model_dump().items():
        setattr(db_app, k, v)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.delete("/jobapps/{app_id}")
def delete_job_app(app_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_app = db.query(JobApplication).filter(JobApplication.user_id == current_user.id, JobApplication.user_id == current_user.id).filter(JobApplication.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(db_app)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — StudyLog
# ============================================================
@router.post("/studylogs/", response_model=StudyLogOut)
def create_study_log(log: StudyLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_log = StudyLog(**log.model_dump(), user_id=current_user.id)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/studylogs/", response_model=List[StudyLogOut])
def get_study_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(StudyLog).filter(StudyLog.user_id == current_user.id, StudyLog.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/studylogs/{log_id}", response_model=StudyLogOut)
def get_study_log(log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = db.query(StudyLog).filter(StudyLog.user_id == current_user.id, StudyLog.user_id == current_user.id).filter(StudyLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Study log not found")
    return log

@router.put("/studylogs/{log_id}", response_model=StudyLogOut)
def update_study_log(log_id: int, log: StudyLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_log = db.query(StudyLog).filter(StudyLog.user_id == current_user.id, StudyLog.user_id == current_user.id).filter(StudyLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Study log not found")
    for k, v in log.model_dump().items():
        setattr(db_log, k, v)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.delete("/studylogs/{log_id}")
def delete_study_log(log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_log = db.query(StudyLog).filter(StudyLog.user_id == current_user.id, StudyLog.user_id == current_user.id).filter(StudyLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Study log not found")
    db.delete(db_log)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — MockInterview
# ============================================================
@router.post("/mockinterviews/", response_model=MockInterviewOut)
def create_mock_interview(interview: MockInterviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_interview = MockInterview(**interview.model_dump(), user_id=current_user.id)
    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)
    return db_interview

@router.get("/mockinterviews/", response_model=List[MockInterviewOut])
def get_mock_interviews(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(MockInterview).filter(MockInterview.user_id == current_user.id, MockInterview.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/mockinterviews/{interview_id}", response_model=MockInterviewOut)
def get_mock_interview(interview_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    interview = db.query(MockInterview).filter(MockInterview.user_id == current_user.id, MockInterview.user_id == current_user.id).filter(MockInterview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Mock interview not found")
    return interview

@router.put("/mockinterviews/{interview_id}", response_model=MockInterviewOut)
def update_mock_interview(interview_id: int, interview: MockInterviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_interview = db.query(MockInterview).filter(MockInterview.user_id == current_user.id, MockInterview.user_id == current_user.id).filter(MockInterview.id == interview_id).first()
    if not db_interview:
        raise HTTPException(status_code=404, detail="Mock interview not found")
    for k, v in interview.model_dump().items():
        setattr(db_interview, k, v)
    db.commit()
    db.refresh(db_interview)
    return db_interview

@router.delete("/mockinterviews/{interview_id}")
def delete_mock_interview(interview_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_interview = db.query(MockInterview).filter(MockInterview.user_id == current_user.id, MockInterview.user_id == current_user.id).filter(MockInterview.id == interview_id).first()
    if not db_interview:
        raise HTTPException(status_code=404, detail="Mock interview not found")
    db.delete(db_interview)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — ProjectMilestone
# ============================================================
@router.post("/milestones/", response_model=ProjectMilestoneOut)
def create_milestone(milestone: ProjectMilestoneCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_milestone = ProjectMilestone(**milestone.model_dump(), user_id=current_user.id)
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone

@router.get("/milestones/", response_model=List[ProjectMilestoneOut])
def get_milestones(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ProjectMilestone).filter(ProjectMilestone.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/milestones/{milestone_id}", response_model=ProjectMilestoneOut)
def get_milestone(milestone_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    milestone = db.query(ProjectMilestone).filter(ProjectMilestone.user_id == current_user.id).filter(ProjectMilestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return milestone

@router.put("/milestones/{milestone_id}", response_model=ProjectMilestoneOut)
def update_milestone(milestone_id: int, milestone: ProjectMilestoneCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_milestone = db.query(ProjectMilestone).filter(ProjectMilestone.user_id == current_user.id).filter(ProjectMilestone.id == milestone_id).first()
    if not db_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for k, v in milestone.model_dump().items():
        setattr(db_milestone, k, v)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone

@router.delete("/milestones/{milestone_id}")
def delete_milestone(milestone_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_milestone = db.query(ProjectMilestone).filter(ProjectMilestone.user_id == current_user.id).filter(ProjectMilestone.id == milestone_id).first()
    if not db_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    db.delete(db_milestone)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — QuestionBank
# ============================================================
@router.post("/questions/seed-agentic-ai")
def seed_agentic_ai_questions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    seed_data = [
        # LLM Fundamentals
        ("LLM Fundamentals", "What is the attention mechanism in Transformers?", "A technique that allows the model to dynamically weigh the importance of different parts of the input sequence for each output token."),
        ("LLM Fundamentals", "What is a token in the context of LLMs?", "The basic unit of data processed by an LLM, which could be a word, part of a word, or a character depending on the tokenizer."),
        ("LLM Fundamentals", "What is the temperature parameter?", "A setting that controls the randomness of the model's output. Lower values make output more deterministic, higher values make it more diverse."),
        ("LLM Fundamentals", "What is Top-p (nucleus) sampling?", "A decoding method where the model selects from the smallest set of tokens whose cumulative probability exceeds the threshold p."),
        ("LLM Fundamentals", "What is Context Window limit?", "The maximum number of tokens an LLM can process at once, including both prompt and generated response."),
        ("LLM Fundamentals", "Explain KV Cache.", "A memory optimization technique in transformers that stores Key and Value tensors from previous layers to avoid redundant computations during autoregressive generation."),
        ("LLM Fundamentals", "What is an embedding?", "A dense vector representation of text that captures semantic meaning, used heavily in search and RAG."),
        
        # Prompt Engineering
        ("Prompt Engineering", "What is Zero-Shot Prompting?", "Asking an LLM to perform a task without providing any examples in the prompt."),
        ("Prompt Engineering", "What is Few-Shot Prompting?", "Providing a few examples (input-output pairs) in the prompt to guide the LLM's response."),
        ("Prompt Engineering", "Explain Chain-of-Thought (CoT) prompting.", "Prompting the LLM to 'think step-by-step', generating intermediate reasoning steps before providing the final answer."),
        ("Prompt Engineering", "What is Tree of Thoughts (ToT)?", "An extension of CoT that explores multiple reasoning paths concurrently and evaluates them to solve complex problems."),
        ("Prompt Engineering", "What is React (Reasoning and Acting) prompting?", "A paradigm where the model alternates between reasoning steps and taking actions (like querying an API)."),
        ("Prompt Engineering", "What is the role of a System Prompt?", "To set the persona, global instructions, and constraints for the LLM's behavior throughout a conversation."),
        ("Prompt Engineering", "What is prompt injection?", "A vulnerability where malicious users craft inputs that override or manipulate the original instructions given to the LLM."),

        # RAG Architecture
        ("RAG Architecture", "What does RAG stand for?", "Retrieval-Augmented Generation."),
        ("RAG Architecture", "What is the primary purpose of RAG?", "To ground LLM responses in external, up-to-date, or proprietary data, reducing hallucinations."),
        ("RAG Architecture", "What is a Vector Database?", "A database optimized for storing and querying high-dimensional vectors (embeddings) using nearest neighbor search."),
        ("RAG Architecture", "Name three common chunking strategies.", "Fixed-size, sentence-level, and semantic chunking."),
        ("RAG Architecture", "What is Cosine Similarity?", "A metric used to measure the similarity between two vectors by calculating the cosine of the angle between them."),
        ("RAG Architecture", "What is Re-ranking in RAG?", "A second-stage retrieval process that scores and re-orders the initial retrieved documents to improve relevance."),
        ("RAG Architecture", "What is Hyde (Hypothetical Document Embeddings)?", "A technique where an LLM generates a hypothetical answer to a query, and that answer's embedding is used for retrieval."),
        ("RAG Architecture", "What is chunk overlap?", "Including a portion of the previous chunk in the next chunk to preserve context across boundaries."),

        # LangChain
        ("LangChain", "What is LangChain?", "A framework for developing applications powered by language models, providing tools for chaining, memory, and agents."),
        ("LangChain", "What is a Chain in LangChain?", "A sequence of calls to LLMs, tools, or data processing utilities linked together to accomplish a task."),
        ("LangChain", "How does LangChain handle Memory?", "It provides classes (like ConversationBufferMemory) to store and inject past interactions into the current prompt."),
        ("LangChain", "What are Document Loaders?", "Utilities in LangChain designed to load data from various sources (PDFs, web pages, databases) into standard Document objects."),
        ("LangChain", "What is an Output Parser?", "A LangChain component that formats the raw text output from an LLM into a structured format like JSON or lists."),
        ("LangChain", "What is a Retriever in LangChain?", "An interface that takes a query and returns relevant documents, abstracting the underlying vector store or search engine."),
        ("LangChain", "Explain the concept of Runnables in LCEL.", "The core abstraction in LangChain Expression Language allowing components to be easily composed using the pipe (|) operator."),

        # Function Calling
        ("Function Calling", "What is Function Calling in LLMs?", "The capability of an LLM to output structured JSON matching a predefined function signature, indicating that the function should be executed."),
        ("Function Calling", "Why use Function Calling over raw text parsing?", "It provides more reliable, deterministic structured output enforced by the model's API, rather than relying on brittle regex or prompting."),
        ("Function Calling", "What format are function signatures usually defined in?", "JSON Schema."),
        ("Function Calling", "Can an LLM execute the function itself?", "No, the LLM only suggests the function and arguments. The application code must execute it and return the result to the LLM."),
        ("Function Calling", "What is Parallel Function Calling?", "The ability of an LLM to request the execution of multiple independent functions in a single response."),
        ("Function Calling", "How is the function result passed back to the LLM?", "As a new message in the chat history, typically with a role like 'tool' or 'function'."),
        ("Function Calling", "What happens if the LLM hallucinates an argument?", "The application will likely throw an error during execution. Robust implementations validate arguments before execution."),

        # Agents
        ("Agents", "What defines an AI Agent?", "An AI system that uses an LLM as a reasoning engine to determine a sequence of actions, use tools, and interact with an environment to achieve a goal."),
        ("Agents", "What is the difference between an Agent and a Chain?", "A Chain has a hardcoded sequence of steps. An Agent uses the LLM to dynamically decide which steps and tools to use."),
        ("Agents", "What is a Tool in the context of Agents?", "An external capability the agent can invoke, such as a calculator, web search, or database query."),
        ("Agents", "What is the ReAct framework?", "Reasoning and Acting - an approach where agents explicitly output their thought process before deciding on an action."),
        ("Agents", "What is an Observation in Agent loops?", "The result or output returned after an agent executes a specific action or tool."),
        ("Agents", "What is a multi-agent system?", "A system where multiple specialized AI agents collaborate, delegate tasks, or debate to solve complex problems."),
        ("Agents", "What is a Plan-and-Solve Agent?", "An agent that first generates a high-level step-by-step plan, then executes each step sequentially."),

        # LangGraph
        ("LangGraph", "What is LangGraph?", "An extension of LangChain for building stateful, multi-actor applications with cyclic computational steps using graph structures."),
        ("LangGraph", "Why use LangGraph instead of standard Agents?", "It provides finer control over agent loops, state management, and multi-agent coordination by defining the flow as a state machine."),
        ("LangGraph", "What is a Node in LangGraph?", "A function or computational step that takes the current state and returns an update to the state."),
        ("LangGraph", "What is an Edge in LangGraph?", "The connections that dictate the flow between nodes, including conditional edges that route based on the state."),
        ("LangGraph", "How is State managed in LangGraph?", "Through a defined State schema (like a TypedDict) that gets passed and updated from node to node."),
        ("LangGraph", "What is a Conditional Edge?", "A routing function in LangGraph that decides which node to execute next based on the current state."),
        ("LangGraph", "Does LangGraph support cyclical flows?", "Yes, unlike traditional LangChain LCEL, LangGraph natively supports cycles (loops), which are essential for agentic behavior.")
    ]

    count = 0
    for topic, question, answer in seed_data:
        db_question = QuestionBank(
            user_id=current_user.id,
            topic=topic,
            question=question,
            answer=answer,
            difficulty='Medium',
            repetition=0,
            interval=0,
            easiness_factor=2.5
        )
        db.add(db_question)
        count += 1
    
    db.commit()
    return {"message": f"Successfully seeded {count} Agentic AI flashcards"}
@router.post("/questions/", response_model=QuestionBankOut)
def create_question(question: QuestionBankCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_question = QuestionBank(**question.model_dump(), user_id=current_user.id)
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@router.post("/questions/bulk", response_model=List[QuestionBankOut])
def create_questions_bulk(questions: List[QuestionBankCreate], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_questions = []
    for q in questions:
        db_q = QuestionBank(**q.model_dump(), user_id=current_user.id, next_review_date=date.today())
        db.add(db_q)
        db_questions.append(db_q)
    db.commit()
    for db_q in db_questions:
        db.refresh(db_q)
    return db_questions

@router.get("/questions/", response_model=List[QuestionBankOut])
def get_questions(skip: int = 0, limit: int = 100, topic: Optional[str] = None, due_only: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(QuestionBank).filter(QuestionBank.user_id == current_user.id)
    if topic:
        query = query.filter(QuestionBank.topic.ilike(f"%{topic}%"))
    if due_only:
        query = query.filter(
            or_(
                QuestionBank.next_review_date.is_(None),
                QuestionBank.next_review_date <= date.today()
            )
        )
    return query.order_by(QuestionBank.next_review_date.asc()).offset(skip).limit(limit).all()
@router.get("/questions/{question_id}", response_model=QuestionBankOut)
def get_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    question = db.query(QuestionBank).filter(QuestionBank.user_id == current_user.id, QuestionBank.user_id == current_user.id).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.put("/questions/{q_id}", response_model=QuestionBankOut)
def update_question(q_id: int, q: QuestionBankCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_q = db.query(QuestionBank).filter(QuestionBank.id == q_id, QuestionBank.user_id == current_user.id).first()
    if not db_q:
        raise HTTPException(status_code=404, detail="Question not found")
    for k, v in q.model_dump(exclude_unset=True).items():
        setattr(db_q, k, v)
    db.commit()
    db.refresh(db_q)
    return db_q

class SRSReviewInput(BaseModel):
    grade: int = Field(..., ge=0, le=5)

@router.post("/questions/{q_id}/review", response_model=QuestionBankOut)
def review_question_srs(q_id: int, review: SRSReviewInput, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_q = db.query(QuestionBank).filter(QuestionBank.id == q_id, QuestionBank.user_id == current_user.id).first()
    if not db_q:
        raise HTTPException(status_code=404, detail="Question not found")

    # SuperMemo-2 Algorithm (SM-2)
    grade = review.grade
    
    # Initialize fields if None
    if db_q.repetition is None: db_q.repetition = 0
    if db_q.interval is None: db_q.interval = 0
    if db_q.easiness_factor is None: db_q.easiness_factor = 2.5

    if grade >= 3:
        if db_q.repetition == 0:
            db_q.interval = 1
        elif db_q.repetition == 1:
            db_q.interval = 6
        else:
            db_q.interval = max(1, round(db_q.interval * db_q.easiness_factor))
        db_q.repetition += 1
    else:
        db_q.repetition = 0
        db_q.interval = 1

    db_q.easiness_factor = db_q.easiness_factor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    if db_q.easiness_factor < 1.3:
        db_q.easiness_factor = 1.3
        
    db_q.next_review_date = date.today() + timedelta(days=db_q.interval)
    db_q.last_revised = date.today()

    db.commit()
    db.refresh(db_q)
    return db_q

@router.delete("/questions/{q_id}")
def delete_question(q_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_question = db.query(QuestionBank).filter(QuestionBank.user_id == current_user.id, QuestionBank.id == q_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(db_question)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — Offer
# ============================================================
@router.post("/offers/", response_model=OfferOut)
def create_offer(offer: OfferCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_offer = Offer(**offer.model_dump(), user_id=current_user.id)
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.get("/offers/", response_model=List[OfferOut])
def get_offers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Offer).filter(Offer.user_id == current_user.id, Offer.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/offers/{offer_id}", response_model=OfferOut)
def get_offer(offer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    offer = db.query(Offer).filter(Offer.user_id == current_user.id, Offer.user_id == current_user.id).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer

@router.put("/offers/{offer_id}", response_model=OfferOut)
def update_offer(offer_id: int, offer: OfferCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_offer = db.query(Offer).filter(Offer.user_id == current_user.id, Offer.user_id == current_user.id).filter(Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    for k, v in offer.model_dump().items():
        setattr(db_offer, k, v)
    db.commit()
    db.refresh(db_offer)
    return db_offer

@router.delete("/offers/{offer_id}")
def delete_offer(offer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_offer = db.query(Offer).filter(Offer.user_id == current_user.id, Offer.user_id == current_user.id).filter(Offer.id == offer_id).first()
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    db.delete(db_offer)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — Reminder
# ============================================================
@router.post("/reminders/", response_model=ReminderOut)
def create_reminder(reminder: ReminderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_reminder = Reminder(**reminder.model_dump(), user_id=current_user.id)
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.get("/reminders/", response_model=List[ReminderOut])
def get_reminders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Reminder).filter(Reminder.user_id == current_user.id, Reminder.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/reminders/{reminder_id}", response_model=ReminderOut)
def get_reminder(reminder_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reminder = db.query(Reminder).filter(Reminder.user_id == current_user.id, Reminder.user_id == current_user.id).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder

@router.put("/reminders/{reminder_id}", response_model=ReminderOut)
def update_reminder(reminder_id: int, reminder: ReminderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_reminder = db.query(Reminder).filter(Reminder.user_id == current_user.id, Reminder.user_id == current_user.id).filter(Reminder.id == reminder_id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    for k, v in reminder.model_dump().items():
        setattr(db_reminder, k, v)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_reminder = db.query(Reminder).filter(Reminder.user_id == current_user.id, Reminder.user_id == current_user.id).filter(Reminder.id == reminder_id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(db_reminder)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — TargetCompany
# ============================================================
@router.post("/targetcompanies/", response_model=TargetCompanyOut)
def create_target_company(tc: TargetCompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_tc = TargetCompany(**tc.model_dump(), user_id=current_user.id)
    db.add(db_tc)
    db.commit()
    db.refresh(db_tc)
    return db_tc

@router.get("/targetcompanies/", response_model=List[TargetCompanyOut])
def get_target_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(TargetCompany).filter(TargetCompany.user_id == current_user.id, TargetCompany.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/targetcompanies/{tc_id}", response_model=TargetCompanyOut)
def get_target_company(tc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tc = db.query(TargetCompany).filter(TargetCompany.user_id == current_user.id, TargetCompany.user_id == current_user.id).filter(TargetCompany.id == tc_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Target company not found")
    return tc

@router.put("/targetcompanies/{tc_id}", response_model=TargetCompanyOut)
def update_target_company(tc_id: int, tc: TargetCompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_tc = db.query(TargetCompany).filter(TargetCompany.user_id == current_user.id, TargetCompany.user_id == current_user.id).filter(TargetCompany.id == tc_id).first()
    if not db_tc:
        raise HTTPException(status_code=404, detail="Target company not found")
    for k, v in tc.model_dump().items():
        setattr(db_tc, k, v)
    db.commit()
    db.refresh(db_tc)
    return db_tc

@router.delete("/targetcompanies/{tc_id}")
def delete_target_company(tc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_tc = db.query(TargetCompany).filter(TargetCompany.user_id == current_user.id, TargetCompany.user_id == current_user.id).filter(TargetCompany.id == tc_id).first()
    if not db_tc:
        raise HTTPException(status_code=404, detail="Target company not found")
    db.delete(db_tc)
    db.commit()
    return {"ok": True}


# ============================================================
# CRUD Endpoints — Goal
# ============================================================
@router.post("/goals/", response_model=GoalOut)
def create_goal(goal: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_goal = Goal(**goal.model_dump(), user_id=current_user.id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.get("/goals/", response_model=List[GoalOut])
def get_goals(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Goal).filter(Goal.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/goals/{goal_id}", response_model=GoalOut)
def get_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.user_id == current_user.id).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.put("/goals/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, goal: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_goal = db.query(Goal).filter(Goal.user_id == current_user.id).filter(Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for k, v in goal.model_dump().items():
        setattr(db_goal, k, v)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_goal = db.query(Goal).filter(Goal.user_id == current_user.id).filter(Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(db_goal)
    db.commit()
    return {"ok": True}

# ============================================================
# Analytics Endpoint
# ============================================================
@router.get("/analytics/summary")
def get_analytics_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    
    # 1. Total Counts
    total_plans = db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id, DailyPlan.user_id == current_user.id).count()
    completed_plans = db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id, DailyPlan.user_id == current_user.id).filter(
        DailyPlan.status.ilike("%done%") | DailyPlan.status.ilike("%complete%")
    ).count()
    
    total_questions = db.query(QuestionBank).filter(QuestionBank.user_id == current_user.id, QuestionBank.user_id == current_user.id).count()
    total_milestones = db.query(ProjectMilestone).filter(ProjectMilestone.user_id == current_user.id, ProjectMilestone.user_id == current_user.id).count()
    completed_milestones = db.query(ProjectMilestone).filter(ProjectMilestone.user_id == current_user.id, ProjectMilestone.user_id == current_user.id).filter(
        ProjectMilestone.status.ilike("%done%") | ProjectMilestone.status.ilike("%complete%")
    ).count()
    
    total_targets = db.query(TargetCompany).filter(TargetCompany.user_id == current_user.id, TargetCompany.user_id == current_user.id).count()
    total_apps = db.query(JobApplication).filter(JobApplication.user_id == current_user.id, JobApplication.user_id == current_user.id).count()
    total_mocks = db.query(MockInterview).filter(MockInterview.user_id == current_user.id, MockInterview.user_id == current_user.id).count()
    
    # 2. Upcoming Daily Plans (Next 5 not done)
    upcoming_plans = db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id).filter(
        DailyPlan.date >= today,
        ~DailyPlan.status.ilike("%done%")
    ).order_by(DailyPlan.date.asc()).limit(5).all()
    
    # 3. Questions by Topic
    questions_by_topic = db.query(
        QuestionBank.topic, func.count(QuestionBank.id)
    ).filter(QuestionBank.user_id == current_user.id).group_by(QuestionBank.topic).all()
    
    # 4. Job App Pipeline (Statuses)
    app_pipeline = db.query(
        JobApplication.status, func.count(JobApplication.id)
    ).filter(JobApplication.user_id == current_user.id).group_by(JobApplication.status).all()
    
    # 5. Study Hours (Last 8 Weeks)
    eight_weeks_ago = today - timedelta(days=56)
    study_logs = db.query(StudyLog).filter(StudyLog.user_id == current_user.id).filter(StudyLog.date >= eight_weeks_ago).all()
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
    upcoming_reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).filter(
        Reminder.completed == False
    ).order_by(Reminder.due_date.asc()).limit(10).all()
    
    # 7. Recent Activity (Latest 5 Study Logs)
    recent_activity = []
    recent_logs = db.query(StudyLog).filter(StudyLog.user_id == current_user.id).order_by(StudyLog.date.desc()).limit(5).all()
    for log in recent_logs:
        recent_activity.append({
            "type": "study",
            "date": log.date.isoformat() if log.date else None,
            "title": f"Studied {log.topic}",
            "desc": f"{log.hours} hours"
        })
    
    # 8. Study Streak
    # Calculate consecutive days with a study log ending near today
    all_dates = db.query(StudyLog.date).filter(StudyLog.user_id == current_user.id).distinct().order_by(StudyLog.date.desc()).all()
    date_set = {d[0] for d in all_dates if d[0]}
    
    current_streak = 0
    check_date = today
    if check_date not in date_set:
        check_date = today - timedelta(days=1)
    
    while check_date in date_set:
        current_streak += 1
        check_date -= timedelta(days=1)
        
    # 9. Smart Study Recommendations (Topics with lowest confidence)
    low_confidence_topics = db.query(
        QuestionBank.topic, func.avg(QuestionBank.confidence)
    ).filter(QuestionBank.user_id == current_user.id).group_by(QuestionBank.topic).order_by(func.avg(QuestionBank.confidence).asc()).limit(3).all()
    study_recommendations = [{"topic": row[0], "avg_confidence": float(row[1] or 0)} for row in low_confidence_topics if row[1] is not None and row[1] < 4.0]

    # 10. Gamification & XP
    import math
    total_hours = db.query(func.sum(StudyLog.hours)).filter(StudyLog.user_id == current_user.id).scalar() or 0
    total_xp = (completed_plans * 50) + (total_hours * 20) + (total_mocks * 100)
    level = math.floor(math.sqrt(total_xp / 50)) + 1
    current_level_xp = ((level - 1) ** 2) * 50
    next_level_xp = (level ** 2) * 50

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
        "current_streak": current_streak,
        "study_recommendations": study_recommendations,
        "gamification": {
            "total_xp": int(total_xp),
            "level": int(level),
            "next_level_xp": int(next_level_xp),
            "current_level_xp": int(current_level_xp)
        }
    }


# ============================================================
# Backup & Export Endpoint
# ============================================================
@router.get("/export/csv")
def export_db_to_csv_zip(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
        zip_file.writestr("daily_plans.csv", to_csv_bytes(db.query(DailyPlan).filter(DailyPlan.user_id == current_user.id, DailyPlan.user_id == current_user.id).all(), [
            "id", "day", "date", "week", "focus_area", "tasks", "hours_planned", "status", "hours_actual", "notes", "ai_guide", "ai_quiz", "quiz_scores"
        ]))
        # 2. Job applications
        zip_file.writestr("job_applications.csv", to_csv_bytes(db.query(JobApplication).filter(JobApplication.user_id == current_user.id, JobApplication.user_id == current_user.id).all(), [
            "id", "date_applied", "company", "role", "location", "source", "job_link", "referral", "status", "recruiter_contact", "next_step", "next_step_date", "notes"
        ]))
        # 3. Study logs
        zip_file.writestr("study_logs.csv", to_csv_bytes(db.query(StudyLog).filter(StudyLog.user_id == current_user.id, StudyLog.user_id == current_user.id).all(), [
            "id", "date", "topic", "subtopic", "hours", "confidence", "sql_solved", "pyspark_solved", "resources", "notes"
        ]))
        # 4. Mock interviews
        zip_file.writestr("mock_interviews.csv", to_csv_bytes(db.query(MockInterview).filter(MockInterview.user_id == current_user.id, MockInterview.user_id == current_user.id).all(), [
            "id", "date", "type", "platform", "score", "strengths", "weak_areas", "action_items"
        ]))
        # 5. Project milestones
        zip_file.writestr("project_milestones.csv", to_csv_bytes(db.query(ProjectMilestone).filter(ProjectMilestone.user_id == current_user.id, ProjectMilestone.user_id == current_user.id).all(), [
            "id", "project", "milestone", "owner", "due_date", "status", "github_url", "notes"
        ]))
        # 6. Question bank
        zip_file.writestr("question_bank.csv", to_csv_bytes(db.query(QuestionBank).filter(QuestionBank.user_id == current_user.id, QuestionBank.user_id == current_user.id).all(), [
            "id", "topic", "question", "difficulty", "answer", "confidence", "last_revised"
        ]))
        # 7. Offers
        zip_file.writestr("offers.csv", to_csv_bytes(db.query(Offer).filter(Offer.user_id == current_user.id, Offer.user_id == current_user.id).all(), [
            "id", "company", "role", "ctc", "base", "bonus", "stocks", "benefits", "notes", "status"
        ]))
        # 8. Reminders
        zip_file.writestr("reminders.csv", to_csv_bytes(db.query(Reminder).filter(Reminder.user_id == current_user.id, Reminder.user_id == current_user.id).all(), [
            "id", "title", "due_date", "completed", "notes"
        ]))
        # 9. Target companies
        zip_file.writestr("target_companies.csv", to_csv_bytes(db.query(TargetCompany).filter(TargetCompany.user_id == current_user.id, TargetCompany.user_id == current_user.id).all(), [
            "id", "company", "tier", "role", "why_it_fits", "referral_contact", "status"
        ]))
        
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=progress_tracker_export.zip"}
    )


@router.get("/youtube/search")
def search_youtube_video(q: str, current_user: User = Depends(get_current_user)):
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

