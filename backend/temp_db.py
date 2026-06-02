import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "progress_tracker.db")
print("Using DB:", db_path)
conn = sqlite3.connect(db_path)
c = conn.cursor()
try:
    c.execute('ALTER TABLE question_bank ADD COLUMN next_review_date DATE')
    conn.commit()
    print('next_review_date added.')
except Exception as e:
    print('Error:', e)
conn.close()
