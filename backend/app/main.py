import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import requests, categories, users, citizens, performance_logs, agents, analytics

app = FastAPI(
    title="Citizen Services Tracker API",
    version="2.0.0",
    description="API for managing citizen service requests"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded evidence files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(requests.router, prefix="/requests", tags=["Requests"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(citizens.router, prefix="/citizens", tags=["Citizens"])
app.include_router(performance_logs.router, prefix="/performance-logs", tags=["Logs"])
app.include_router(agents.router, prefix="/agents", tags=["Agents"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

@app.get("/")
def root():
    return {"message": "Citizen Services API"}

@app.get("/health")
def health():
    return {"status": "OK"}
