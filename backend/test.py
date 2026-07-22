from models import SessionLocal, User
from api import get_questions
from datetime import date
import traceback

db = SessionLocal()
try:
    user = db.query(User).first()
    if user:
        qs = get_questions(skip=0, limit=100, topic=None, due_only=True, db=db, current_user=user)
        print("Success:", len(qs))
    else:
        print("No user")
except Exception as e:
    traceback.print_exc()
