from fastapi import APIRouter, HTTPException, Query, Body, Header, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import os
from uuid import uuid4
from app.database import (
    requests_collection, 
    performance_logs_collection,
    db
)
from app.models import ServiceRequest, ServiceRequestResponse

router = APIRouter()
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

def to_response_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.utcnow()
    _id = str(doc.get("_id")) if doc.get("_id") is not None else None
    title = doc.get("title") or "Untitled"
    description = doc.get("description") or ""
    category = doc.get("category") or "general"
    priority = (doc.get("priority") or "P2")
    status = doc.get("status") or "new"
    loc = doc.get("location") or {}
    coords = loc.get("coordinates") or []
    if not (isinstance(coords, list) and len(coords) == 2):
        coords = [0.0, 0.0]
    # Build a safe location object
    location = {
        "type": loc.get("type") or "Point",
        "coordinates": coords,
        "address_hint": loc.get("address_hint"),
        "zone_id": loc.get("zone_id") or get_zone_from_coordinates(
            coords[1] if len(coords) > 1 else 0.0,
            coords[0] if len(coords) > 0 else 0.0,
        ),
    }
    timestamps = doc.get("timestamps") or {"created_at": now, "updated_at": now}
    # Ensure required timestamp fields exist
    if not timestamps.get("created_at"):
        timestamps["created_at"] = now
    if not timestamps.get("updated_at"):
        timestamps["updated_at"] = now
    return {
        "_id": _id,
        "request_id": doc.get("request_id"),
        "title": title,
        "description": description,
        "category": category,
        "location": location,
        "address": doc.get("address"),
        "status": status,
        "priority": priority,
        "timestamps": timestamps,
    }

def get_zone_from_coordinates(lat: float, lng: float) -> str:
    if 31.93 <= lat <= 31.96 and 35.90 <= lng <= 35.93:
        return "ZONE-DT-01"
    elif lat >= 31.96 and lng >= 35.90:
        return "ZONE-N-03"
    elif lat <= 31.93 and lng <= 35.90:
        return "ZONE-W-02"
    return "UNKNOWN"

def get_skill_from_category(category: str) -> str:
    skills = {
        "pothole": "road",
        "streetlight": "road",
        "water_leak": "water",
        "missed_trash": "waste"
    }
    return skills.get(category, category)

def get_agent_workload(agent_id: str) -> int:
    count = requests_collection.count_documents({
        "assignment.assigned_agent_id": agent_id,
        "status": {"$in": ["assigned", "in_progress"]}
    })
    return count

def find_best_agent(zone_id: str, skill_needed: str) -> Optional[Dict]:
    candidates = list(db["service_agents"].find({
        "skills": skill_needed,
        "coverage_zones": zone_id,
        "active": True
    }))
    
    if not candidates:
        candidates = list(db["service_agents"].find({
            "skills": skill_needed,
            "active": True
        }))
    
    if not candidates:
        return None
    
    best_agent = min(candidates, key=lambda a: get_agent_workload(str(a["_id"])))
    return best_agent

def require_staff_key(x_staff_key: Optional[str] = Header(default=None)):
    expected = os.getenv("STAFF_API_KEY")
    if expected and (not x_staff_key or x_staff_key != expected):
        raise HTTPException(status_code=403, detail="Staff key required")

@router.post("/", response_model=ServiceRequestResponse, status_code=201)
async def create_request(request: ServiceRequest):
    try:
        now = datetime.utcnow()
        
        location = request.location
        loc_coords = None
        if location is not None:
            if hasattr(location, "coordinates"):
                loc_coords = location.coordinates
            elif isinstance(location, dict):
                loc_coords = location.get("coordinates")
        lat = loc_coords[1] if loc_coords and len(loc_coords) > 1 else 0
        lng = loc_coords[0] if loc_coords and len(loc_coords) > 0 else 0
        zone_id = get_zone_from_coordinates(lat, lng)
        loc_dict = None
        if location is not None:
            try:
                loc_dict = location.model_dump()
            except Exception:
                loc_dict = dict(location) if isinstance(location, dict) else None
        if loc_dict is None:
            loc_dict = {"type": "Point", "coordinates": [lng, lat]}
        loc_dict["zone_id"] = zone_id
        
        request_data = {
            "citizen_ref": request.citizen_ref,
            "title": request.title,
            "category": request.category,
            "description": request.description,
            "priority": request.priority,
            "location": loc_dict,
            "address": request.address,
            "status": "new",
            "assignment": {},
            "timestamps": {
                "created_at": now,
                "updated_at": now
            },
            "created_at": now
        }
        
        result = requests_collection.insert_one(request_data)
        request_id = result.inserted_id
        
        skill_needed = get_skill_from_category(request.category)
        
        if zone_id:
            best_agent = find_best_agent(zone_id, skill_needed)
            if best_agent:
                agent_id = str(best_agent["_id"])
                requests_collection.update_one(
                    {"_id": request_id},
                    {"$set": {
                        "assignment": {
                            "assigned_agent_id": agent_id,
                            "assignment_policy": "auto"
                        },
                        "status": "assigned",
                        "timestamps.assigned_at": now
                    }}
                )
                
                event = {
                    "type": "assigned",
                    "by": {"actor_type": "system", "actor_id": "auto"},
                    "at": now,
                    "meta": {"agent_id": agent_id}
                }
                performance_logs_collection.insert_one({
                    "request_id": request_id,
                    "event_stream": [event],
                    "created_at": now
                })
        
        created = requests_collection.find_one({"_id": request_id})
        created["_id"] = str(created["_id"])
        return created
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ServiceRequestResponse])
async def get_requests(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    try:
        query = {}
        if status:
            query["status"] = status
        if category:
            query["category"] = category
        if zone_id:
            query["location.zone_id"] = zone_id
        if agent_id:
            query["assignment.assigned_agent_id"] = agent_id
        
        requests_raw = list(requests_collection.find(query).skip(skip).limit(limit))
        safe_list = [to_response_doc(req) for req in requests_raw]
        return safe_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{request_id}", response_model=ServiceRequestResponse)
async def get_request(request_id: str):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        doc = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Request not found")
        return to_response_doc(doc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{request_id}/assign")
async def assign_request(
    request_id: str,
    payload: Dict[str, Any] = Body(...),
    x_staff_key: Optional[str] = Header(default=None)
):
    try:
        require_staff_key(x_staff_key)
        
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        agent_id = payload.get("agent_id")
        if not agent_id or not ObjectId.is_valid(agent_id):
            raise HTTPException(status_code=400, detail="Invalid agent_id")
        
        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        agent = db["service_agents"].find_one({"_id": ObjectId(agent_id)})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        now = datetime.utcnow()
        requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "assignment": {
                    "assigned_agent_id": agent_id,
                    "assignment_policy": "manual"
                },
                "status": "assigned",
                "timestamps.assigned_at": now,
                "timestamps.updated_at": now
            }}
        )
        
        event = {
            "type": "assigned",
            "by": {"actor_type": "staff", "actor_id": "manual"},
            "at": now,
            "meta": {"agent_id": agent_id}
        }
        log = performance_logs_collection.find_one({"request_id": ObjectId(request_id)})
        if log:
            performance_logs_collection.update_one(
                {"_id": log["_id"]},
                {"$push": {"event_stream": event}}
            )
        else:
            performance_logs_collection.insert_one({
                "request_id": ObjectId(request_id),
                "event_stream": [event],
                "created_at": now
            })
        
        return {"message": "Assigned successfully", "agent_id": agent_id, "agent_name": agent.get("name")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{request_id}/status")
async def update_status(
    request_id: str,
    payload: Dict[str, Any] = Body(...),
    x_agent_id: Optional[str] = Header(default=None)
):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        new_status = payload.get("status")
        if new_status not in ("in_progress", "resolved", "closed"):
            raise HTTPException(status_code=400, detail="Invalid status")
        
        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        now = datetime.utcnow()
        updates = {
            "status": new_status,
            "timestamps.updated_at": now
        }
        
        if new_status == "resolved":
            updates["timestamps.resolved_at"] = now
        
        requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": updates}
        )
        
        event = {
            "type": f"status_{new_status}",
            "by": {"actor_type": "agent", "actor_id": x_agent_id or "system"},
            "at": now,
            "meta": {"status": new_status}
        }
        log = performance_logs_collection.find_one({"request_id": ObjectId(request_id)})
        if log:
            performance_logs_collection.update_one(
                {"_id": log["_id"]},
                {"$push": {"event_stream": event}}
            )
        
        return {"message": f"Status updated to {new_status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{request_id}/comments")
async def get_request_comments(request_id: str):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        comments = list(db["comments"].find({"request_id": ObjectId(request_id)}))
        safe_comments = []
        for c in comments:
            safe_c = {
                "_id": str(c.get("_id")) if c.get("_id") else None,
                "request_id": str(c.get("request_id")) if c.get("request_id") else request_id,
                "author_type": c.get("author_type", "citizen"),
                "author_id": str(c.get("author_id")) if c.get("author_id") else "anonymous",
                "author_name": c.get("author_name", "Anonymous"),
                "content": c.get("content", ""),
                "is_internal": c.get("is_internal", False),
                "created_at": c.get("created_at").isoformat() if c.get("created_at") else None
            }
            safe_comments.append(safe_c)
        return {"comments": safe_comments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/comment")
async def add_comment(request_id: str, payload: Dict[str, Any] = Body(...)):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        now = datetime.utcnow()
        comment_doc = {
            "request_id": ObjectId(request_id),
            "author_type": payload.get("author_type", "citizen"),
            "author_id": payload.get("author_id", "anonymous"),
            "author_name": payload.get("author_name", "Anonymous"),
            "content": payload.get("content", ""),
            "is_internal": payload.get("is_internal", False),
            "created_at": now
        }
        result = db["comments"].insert_one(comment_doc)
        return {
            "_id": str(result.inserted_id),
            "request_id": request_id,
            "author_type": comment_doc["author_type"],
            "author_id": str(comment_doc["author_id"]),
            "author_name": comment_doc["author_name"],
            "content": comment_doc["content"],
            "is_internal": comment_doc["is_internal"],
            "created_at": now.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{request_id}/rating")
async def get_request_rating(request_id: str):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        rating = db["ratings"].find_one({"request_id": ObjectId(request_id)})
        if not rating:
            return {}
        
        return {
            "_id": str(rating.get("_id")) if rating.get("_id") else None,
            "request_id": str(rating.get("request_id")) if rating.get("request_id") else request_id,
            "citizen_id": str(rating.get("citizen_id")) if rating.get("citizen_id") else "anonymous",
            "stars": rating.get("stars", 3),
            "reason_code": rating.get("reason_code"),
            "comment": rating.get("comment"),
            "dispute_flag": rating.get("dispute_flag", False),
            "created_at": rating.get("created_at").isoformat() if rating.get("created_at") else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/rating")
async def add_rating(request_id: str, payload: Dict[str, Any] = Body(...)):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        now = datetime.utcnow()
        rating_doc = {
            "request_id": ObjectId(request_id),
            "citizen_id": payload.get("citizen_id", "anonymous"),
            "stars": payload.get("stars", 3),
            "reason_code": payload.get("reason_code"),
            "comment": payload.get("comment"),
            "dispute_flag": False,
            "created_at": now
        }
        result = db["ratings"].insert_one(rating_doc)
        return {
            "_id": str(result.inserted_id),
            "request_id": request_id,
            "citizen_id": str(rating_doc["citizen_id"]),
            "stars": rating_doc["stars"],
            "reason_code": rating_doc["reason_code"],
            "comment": rating_doc["comment"],
            "dispute_flag": rating_doc["dispute_flag"],
            "created_at": now.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/evidence")
async def add_evidence(request_id: str, payload: Dict[str, Any] = Body(...)):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        now = datetime.utcnow()
        evidence = {
            "type": payload.get("type", "photo"),
            "url": payload.get("url", ""),
            "sha256": payload.get("sha256"),
            "uploaded_by": payload.get("uploaded_by", "citizen"),
            "uploaded_at": now
        }
        requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$push": {"evidence": evidence}}
        )
        return {
            "type": evidence["type"],
            "url": evidence["url"],
            "sha256": evidence["sha256"],
            "uploaded_by": evidence["uploaded_by"],
            "uploaded_at": now.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/evidence/upload")
async def upload_evidence(
    request_id: str,
    file: UploadFile = File(...),
    uploaded_by: Optional[str] = Form("citizen"),
    evidence_type: Optional[str] = Form("photo"),
):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")

        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")

        now = datetime.utcnow()
        original_name = file.filename or "upload"
        ext = os.path.splitext(original_name)[1]
        safe_ext = ext if ext.lower() in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf") else ""
        filename = f"{uuid4().hex}{safe_ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(await file.read())

        file_url = f"/uploads/{filename}"
        evidence = {
            "type": evidence_type or "photo",
            "url": file_url,
            "sha256": None,
            "uploaded_by": uploaded_by or "citizen",
            "uploaded_at": now,
        }

        requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$push": {"evidence": evidence}},
        )

        return {
            "url": file_url,
            "type": evidence["type"],
            "uploaded_by": evidence["uploaded_by"],
            "uploaded_at": now.isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{request_id}/transition")
async def transition_request(request_id: str, payload: Dict[str, Any] = Body(...)):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        new_state = payload.get("new_state")
        if new_state not in ("new", "triaged", "assigned", "in_progress", "resolved", "closed"):
            raise HTTPException(status_code=400, detail="Invalid state")
        
        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        now = datetime.utcnow()
        requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "status": new_state,
                "timestamps.updated_at": now
            }}
        )
        return {"message": f"Transitioned to {new_state}", "status": new_state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/auto-assign")
async def auto_assign_request(request_id: str, x_staff_key: Optional[str] = Header(default=None)):
    try:
        require_staff_key(x_staff_key)
        
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        loc = req.get("location") or {}
        coords = loc.get("coordinates") or [0, 0]
        lat = coords[1] if len(coords) > 1 else 0
        lng = coords[0] if len(coords) > 0 else 0
        zone_id = get_zone_from_coordinates(lat, lng)
        category = req.get("category", "general")
        skill_needed = get_skill_from_category(category)
        
        best_agent = find_best_agent(zone_id, skill_needed)
        if not best_agent:
            raise HTTPException(status_code=400, detail="No suitable agent found")
        
        agent_id = str(best_agent["_id"])
        now = datetime.utcnow()
        requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "assignment": {
                    "assigned_agent_id": agent_id,
                    "assignment_policy": "auto"
                },
                "status": "assigned",
                "timestamps.assigned_at": now,
                "timestamps.updated_at": now
            }}
        )
        
        event = {
            "type": "assigned",
            "by": {"actor_type": "system", "actor_id": "auto"},
            "at": now,
            "meta": {"agent_id": agent_id}
        }
        log = performance_logs_collection.find_one({"request_id": ObjectId(request_id)})
        if log:
            performance_logs_collection.update_one(
                {"_id": log["_id"]},
                {"$push": {"event_stream": event}}
            )
        else:
            performance_logs_collection.insert_one({
                "request_id": ObjectId(request_id),
                "event_stream": [event],
                "created_at": now
            })
        
        return {"message": "Auto-assigned", "agent_id": agent_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{request_id}/milestone")
async def add_milestone(request_id: str, payload: Dict[str, Any] = Body(...), x_agent_id: Optional[str] = Header(default=None)):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        milestone_type = payload.get("type", "progress")
        
        req = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if milestone_type == "resolved":
            requests_collection.update_one(
                {"_id": ObjectId(request_id)},
                {"$set": {"status": "resolved", "timestamps.resolved_at": datetime.utcnow()}}
            )
        elif milestone_type == "arrived":
            requests_collection.update_one(
                {"_id": ObjectId(request_id)},
                {"$set": {"status": "in_progress"}}
            )
        
        now = datetime.utcnow()
        event = {
            "type": f"milestone_{milestone_type}",
            "by": {"actor_type": "agent", "actor_id": x_agent_id or "system"},
            "at": now,
            "meta": {"milestone": milestone_type}
        }
        log = performance_logs_collection.find_one({"request_id": ObjectId(request_id)})
        if log:
            performance_logs_collection.update_one(
                {"_id": log["_id"]},
                {"$push": {"event_stream": event}}
            )
        else:
            performance_logs_collection.insert_one({
                "request_id": ObjectId(request_id),
                "event_stream": [event],
                "created_at": now
            })
        
        return {"message": f"Milestone {milestone_type} recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{request_id}")
async def delete_request(request_id: str):
    try:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        result = requests_collection.delete_one({"_id": ObjectId(request_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return {"message": "Request deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
