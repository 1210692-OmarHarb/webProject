from fastapi import APIRouter, HTTPException
from app.database import performance_logs_collection, requests_collection
from app.models import PerformanceLog
from bson import ObjectId
from typing import List

router = APIRouter()

@router.get("/", response_model=List[PerformanceLog])
async def get_all_performance_logs(request_id: str = None):
    try:
        query = {}
        if request_id:
            query["request_id"] = ObjectId(request_id)
        logs = list(performance_logs_collection.find(query))
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{log_id}", response_model=PerformanceLog)
async def get_performance_log(log_id: str):
    try:
        log = performance_logs_collection.find_one({"_id": ObjectId(log_id)})
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        return log
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/", response_model=PerformanceLog)
async def create_performance_log(log: PerformanceLog):
    try:
        log_dict = log.dict(exclude={"id"}, exclude_none=True)
        result = performance_logs_collection.insert_one(log_dict)
        created_log = performance_logs_collection.find_one({"_id": result.inserted_id})
        return created_log
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{log_id}")
async def update_performance_log(log_id: str, log: PerformanceLog):
    try:
        update_data = log.dict(exclude={"id"}, exclude_none=True)
        result = performance_logs_collection.update_one(
            {"_id": ObjectId(log_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Log not found")
        updated_log = performance_logs_collection.find_one({"_id": ObjectId(log_id)})
        return updated_log
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{log_id}")
async def delete_performance_log(log_id: str):
    try:
        result = performance_logs_collection.delete_one({"_id": ObjectId(log_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Log not found")
        return {"message": "Log deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
