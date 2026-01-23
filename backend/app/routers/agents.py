from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import os
from app.database import db

router = APIRouter()

def get_zone_from_coordinates(lat: float, lng: float) -> str:
    if 31.93 <= lat <= 31.96 and 35.90 <= lng <= 35.93:
        return "ZONE-DT-01"
    elif lat >= 31.96 and lng >= 35.90:
        return "ZONE-N-03"
    elif lat <= 31.93 and lng <= 35.90:
        return "ZONE-W-02"
    return "UNKNOWN"

def require_staff_key(x_staff_key: Optional[str] = Header(default=None)):
    expected = os.getenv("STAFF_API_KEY")
    if expected and (not x_staff_key or x_staff_key != expected):
        raise HTTPException(status_code=403, detail="Staff key required")

def get_agent_workload(agent_id: str) -> int:
    count = db["service_requests"].count_documents({
        "assignment.assigned_agent_id": agent_id,
        "status": {"$in": ["assigned", "in_progress"]}
    })
    return count

@router.get("/")
async def list_agents(skill: Optional[str] = None, zone: Optional[str] = None):
    try:
        query = {}
        if skill:
            query["skills"] = skill
        if zone:
            query["coverage_zones"] = zone
        
        agents = list(db["service_agents"].find(query))
        for agent in agents:
            agent["_id"] = str(agent["_id"])
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", dependencies=[])
async def create_agent(
    payload: Dict[str, Any],
    x_staff_key: Optional[str] = Header(default=None)
):
    try:
        require_staff_key(x_staff_key)
        
        name = payload.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="Name required")
        
        base_location = payload.get("base_location", {})
        coverage_zones = payload.get("coverage_zones", [])
        
        if base_location and "coordinates" in base_location:
            lat, lng = base_location["coordinates"]
            zone = get_zone_from_coordinates(lat, lng)
            if zone not in coverage_zones:
                coverage_zones.append(zone)
        
        agent_data = {
            "name": name,
            "type": payload.get("type", "agent"),
            "skills": payload.get("skills", []),
            "coverage_zones": coverage_zones,
            "base_location": base_location,
            "schedule": payload.get("schedule", []),
            "active": True,
            "created_at": datetime.utcnow()
        }
        
        result = db["service_agents"].insert_one(agent_data)
        agent = db["service_agents"].find_one({"_id": result.inserted_id})
        agent["_id"] = str(agent["_id"])
        return agent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    try:
        if not ObjectId.is_valid(agent_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        agent = db["service_agents"].find_one({"_id": ObjectId(agent_id)})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        workload = get_agent_workload(agent_id)
        
        agent["_id"] = str(agent["_id"])
        return {
            "agent": agent,
            "metrics": {
                "workload": workload
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{agent_id}")
async def update_agent(
    agent_id: str,
    payload: Dict[str, Any],
    x_staff_key: Optional[str] = Header(default=None)
):
    try:
        require_staff_key(x_staff_key)
        
        if not ObjectId.is_valid(agent_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        agent = db["service_agents"].find_one({"_id": ObjectId(agent_id)})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        update_data = {}
        if "name" in payload:
            update_data["name"] = payload["name"]
        if "skills" in payload:
            update_data["skills"] = payload["skills"]
        if "coverage_zones" in payload:
            update_data["coverage_zones"] = payload["coverage_zones"]
        if "base_location" in payload:
            update_data["base_location"] = payload["base_location"]
        if "schedule" in payload:
            update_data["schedule"] = payload["schedule"]
        
        db["service_agents"].update_one(
            {"_id": ObjectId(agent_id)},
            {"$set": update_data}
        )
        
        return {"message": "Agent updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    x_staff_key: Optional[str] = Header(default=None)
):
    try:
        require_staff_key(x_staff_key)
        
        if not ObjectId.is_valid(agent_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        result = db["service_agents"].delete_one({"_id": ObjectId(agent_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return {"message": "Agent deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
