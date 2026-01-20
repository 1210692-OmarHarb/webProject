from fastapi import FastAPI
from app.routers import requests

app = FastAPI(
    title="Citizen Services Tracker API",
    version="1.0.0"
)

app.include_router(requests.router, prefix="/requests", tags=["Requests"])


@app.get("/")
def root():
    return {"status": "CST API running"}
