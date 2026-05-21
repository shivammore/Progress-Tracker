import re
import os

api_path = r"e:\progress_tracker\backend\api.py"

with open(api_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
if "from .auth" not in content:
    imports_to_add = """
from .models import User
from .auth import get_current_user, create_access_token, get_password_hash, verify_password
from fastapi.security import OAuth2PasswordRequestForm
"""
    # Insert right after router = APIRouter()
    content = content.replace("router = APIRouter()", "router = APIRouter()\n" + imports_to_add)


# 2. Auth Endpoints
auth_endpoints = """
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
        db.query(model).filter(model.user_id == None).update({model.user_id: new_user.id})
    db.commit()
    
    return {"message": "User registered successfully"}

@router.post("/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

"""

if "/auth/register" not in content:
    content = content.replace("# ============================================================\n# Pydantic Schemas", auth_endpoints + "\n# ============================================================\n# Pydantic Schemas")

# 3. Add current_user to routes
# Find all `@router.get`, `@router.post`, etc. and replace the following `def ... (..., db: Session = Depends(get_db)):`
# EXCLUDING auth endpoints we just added
def replace_signature(match):
    # match.group(0) is the entire signature string
    if "login_for_access_token" in match.group(0) or "register_user" in match.group(0):
        return match.group(0)
    
    # Add current_user
    new_sig = match.group(0).replace("db: Session = Depends(get_db)", "db: Session = Depends(get_db), current_user: User = Depends(get_current_user)")
    return new_sig

content = re.sub(r'def [a-zA-Z0-9_]+\(.*db:\s*Session\s*=\s*Depends\(get_db\)\s*\):', replace_signature, content)


# 4. Inject `.filter(Model.user_id == current_user.id)` into queries
models = [
    "DailyPlan", "JobApplication", "StudyLog", "MockInterview", 
    "ProjectMilestone", "QuestionBank", "Offer", "Reminder", "TargetCompany"
]

# For simple query: db.query(Model).
for m in models:
    content = re.sub(
        rf'db\.query\({m}\)\.',
        rf'db.query({m}).filter({m}.user_id == current_user.id).',
        content
    )
    content = re.sub(
        rf'db\.query\({m}\)$',
        rf'db.query({m}).filter({m}.user_id == current_user.id)',
        content
    )
    
    # For column queries: db.query(Model.column
    # Like db.query(QuestionBank.topic, func.count(QuestionBank.id))
    content = re.sub(
        rf'db\.query\((.*?(?:{m}).*?)\)\.',
        rf'db.query(\1).filter({m}.user_id == current_user.id).',
        content
    )

# Fix double filters (if any): .filter(Model.user_id == current_user.id).filter(
for m in models:
    content = content.replace(f".filter({m}.user_id == current_user.id).filter(", f".filter({m}.user_id == current_user.id, ")

# 5. Inject user_id into model creation
# db_plan = DailyPlan(**plan.model_dump())
for m in models:
    content = re.sub(
        rf'{m}\(\*\*(.*?)\.model_dump\(\)\)',
        rf'{m}(**\1.model_dump(), user_id=current_user.id)',
        content
    )


with open(api_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("API refactored successfully.")
