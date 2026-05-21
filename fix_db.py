import sqlite3
import os

db_path = 'progress_tracker.db'
backup_path = 'progress_tracker_backup.db'

# 1. Rename old db
if os.path.exists(backup_path):
    os.remove(backup_path)
os.rename(db_path, backup_path)

# 2. Create new DB using SQLAlchemy models
from backend.models import Base, engine
Base.metadata.create_all(engine)

# 3. Copy data from old DB to new DB
conn_new = sqlite3.connect(db_path)
conn_old = sqlite3.connect(backup_path)

# Ensure new DB accepts inserts into autoincrement ID if we supply it
tables = [
    'daily_plan', 'job_applications', 'study_logs', 'mock_interviews', 
    'project_milestones', 'question_bank', 'offers', 'reminders', 'target_companies'
]

for table in tables:
    print(f"Migrating {table}...")
    try:
        # Get columns from new table
        cur_new = conn_new.execute(f"PRAGMA table_info({table})")
        cols = [col[1] for col in cur_new.fetchall()]
        
        if not cols:
            print(f"Table {table} not found in new DB.")
            continue
            
        # Get data from old table
        # Only select columns that exist in both
        cur_old = conn_old.execute(f"PRAGMA table_info({table})")
        old_cols = [col[1] for col in cur_old.fetchall()]
        
        common_cols = [c for c in cols if c in old_cols]
        if not common_cols:
            continue
            
        col_str = ', '.join([f'"{c}"' for c in common_cols])
        placeholders = ', '.join(['?' for _ in common_cols])
        
        rows = conn_old.execute(f"SELECT {col_str} FROM {table}").fetchall()
        
        if rows:
            conn_new.executemany(f"INSERT INTO {table} ({col_str}) VALUES ({placeholders})", rows)
            conn_new.commit()
            print(f"  Inserted {len(rows)} rows into {table}")
    except Exception as e:
        print(f"Error migrating {table}: {e}")

print("Migration complete!")
