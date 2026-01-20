from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import requests, categories, users, performance_logs

app = FastAPI(
    title="Citizen Services Tracker API",
    version="2.0.0",
    description="Advanced MIS for managing citizen service requests with workflow, SLA, and analytics"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(requests.router, prefix="/requests", tags=["Service Requests"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(performance_logs.router, prefix="/performance-logs", tags=["Performance Logs"])


@app.get("/")
def root():
    return {"status": "CST API running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
