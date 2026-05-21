import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "progress_tracker.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables = [
    "job_applications",
    "project_milestones"
]

for table in tables:
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER")
        print(f"Added user_id to {table}")
    except sqlite3.OperationalError as e:
        print(f"Skipping {table} (maybe user_id already exists?): {e}")

conn.commit()
conn.close()

print("Migration applied!")
