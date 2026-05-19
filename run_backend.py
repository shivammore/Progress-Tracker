import sys
import os

# Force the current working directory to be at the absolute top of the import path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import uvicorn

if __name__ == "__main__":
    print("Starting FastAPI backend with local path priority...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8002, reload=False)
