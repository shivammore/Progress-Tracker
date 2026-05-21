
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import router as api_router


app = FastAPI(title="Progress Tracker API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/")
def read_root():
    return {"msg": "Progress Tracker API is running."}


# All CRUD endpoints are in api.py
app.include_router(api_router)
