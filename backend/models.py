from sqlalchemy import create_engine, Column, Integer, String, Date, Float, Boolean, Text, ForeignKey, func
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import os

# Use absolute path to the DB file in the project root
_db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "progress_tracker.db")
DATABASE_URL = f"sqlite:///{_db_path}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Shared DB dependency — import this in main.py and api.py
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# User Model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)

# Daily Plan
class DailyPlan(Base):
    __tablename__ = "daily_plan"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    track_name = Column(String, default="Default")
    day = Column(Integer, index=True)
    date = Column(Date)
    week = Column(String)
    focus_area = Column(String)
    tasks = Column(Text)
    hours_planned = Column(Float)
    status = Column(String)
    hours_actual = Column(Float)
    notes = Column(Text)
    ai_guide = Column(Text, nullable=True)
    ai_quiz = Column(Text, nullable=True)
    quiz_scores = Column(Text, nullable=True)

# Job Application
class JobApplication(Base):
    __tablename__ = "job_applications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date_applied = Column(Date)
    company = Column(String)
    role = Column(String)
    location = Column(String)
    source = Column(String)
    job_link = Column(String)
    referral = Column(String)
    status = Column(String)
    recruiter_contact = Column(String)
    next_step = Column(String)
    next_step_date = Column(Date)
    notes = Column(Text)

# Study Log
class StudyLog(Base):
    __tablename__ = "study_log"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)
    topic = Column(String)
    subtopic = Column(String)
    hours = Column(Float)
    confidence = Column(Integer)
    sql_solved = Column(Integer)
    pyspark_solved = Column(Integer)
    resources = Column(Text)
    notes = Column(Text)

# Mock Interview
class MockInterview(Base):
    __tablename__ = "mock_interviews"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)
    type = Column(String)
    platform = Column(String)
    score = Column(Integer)
    strengths = Column(Text)
    weak_areas = Column(Text)
    action_items = Column(Text)

# Project Milestone
class ProjectMilestone(Base):
    __tablename__ = "project_milestones"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    project = Column(String)
    milestone = Column(String)
    owner = Column(String)
    due_date = Column(Date)
    status = Column(String)
    github_url = Column(String)
    notes = Column(Text)

# Flashcard / Question Bank
class QuestionBank(Base):
    __tablename__ = "question_bank"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    question = Column(String)
    answer = Column(Text)
    difficulty = Column(String)
    
    # SRS Fields
    next_review_date = Column(Date, default=func.current_date())
    interval = Column(Integer, default=0) # Days until next review
    repetition = Column(Integer, default=0) # Number of successful reviews
    easiness_factor = Column(Float, default=2.5)

    confidence = Column(Integer)
    last_revised = Column(Date)

# Offer Comparison
class Offer(Base):
    __tablename__ = "offers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company = Column(String)
    role = Column(String)
    ctc = Column(Float)
    base = Column(Float)
    bonus = Column(Float)
    stocks = Column(Float)
    benefits = Column(Text)
    notes = Column(Text)
    status = Column(String)

# Reminder
class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    due_date = Column(Date)
    completed = Column(Boolean, default=False)
    notes = Column(Text)

# Target Company
class TargetCompany(Base):
    __tablename__ = "target_companies"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company = Column(String)
    tier = Column(String)
    role = Column(String)
    why_it_fits = Column(Text)
    referral_contact = Column(String)
    status = Column(String)

# Goal
class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    target_date = Column(Date)
    status = Column(String)
    progress = Column(Integer) # Percentage 0-100
    notes = Column(Text)

# Create all tables
Base.metadata.create_all(bind=engine)
