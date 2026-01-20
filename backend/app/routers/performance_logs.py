from fastapi import APIRouter, HTTPException
from app.database import performance_logs_collection, requests_collection
from app.models import PerformanceLog
from bson import ObjectId
from typing import List

router = APIRouter()


@router.get("/", response_model=List[PerformanceLog])
async def get_all_performance_logs(request_id: str = None):
    """Get performance logs, optionally filtered by request_id"""
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
    """Get specific performance log"""
    try:
        log = performance_logs_collection.find_one({"_id": ObjectId(log_id)})
        if not log:
            raise HTTPException(status_code=404, detail="Performance log not found")
        return log
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/request/{request_id}", response_model=PerformanceLog)
async def get_log_by_request(request_id: str):
    """Get performance log for a specific request"""
    try:
        log = performance_logs_collection.find_one({"request_id": ObjectId(request_id)})
        if not log:
            raise HTTPException(status_code=404, detail="No performance log found for this request")
        return log
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/", response_model=PerformanceLog)
async def create_performance_log(log: PerformanceLog):
    """Create new performance log for a request"""
    try:
        log_dict = log.dict(exclude={"id"}, exclude_none=True)
        result = performance_logs_collection.insert_one(log_dict)
        created_log = performance_logs_collection.find_one({"_id": result.inserted_id})
        return created_log
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{log_id}")
async def update_performance_log(log_id: str, log: PerformanceLog):
    """Update performance log (add events, update KPIs)"""
    try:
        update_data = log.dict(exclude={"id"}, exclude_none=True)
        result = performance_logs_collection.update_one(
            {"_id": ObjectId(log_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Performance log not found")
        updated_log = performance_logs_collection.find_one({"_id": ObjectId(log_id)})
        return updated_log
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/add-event")
async def add_event_to_log(request_id: str, event_type: str, actor_type: str, actor_id: str, meta: dict = None):
    """Add an event to request's performance log"""
    try:
        from datetime import datetime
        
        log = performance_logs_collection.find_one({"request_id": ObjectId(request_id)})
        if not log:
            raise HTTPException(status_code=404, detail="No performance log found for this request")
        
        event = {
            "type": event_type,
            "by": {"actor_type": actor_type, "actor_id": actor_id},
            "at": datetime.utcnow(),
            "meta": meta or {}
        }
        
        result = performance_logs_collection.update_one(
            {"_id": log["_id"]},
            {"$push": {"event_stream": event}}
        )
        
        updated_log = performance_logs_collection.find_one({"_id": log["_id"]})
        return updated_log
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
