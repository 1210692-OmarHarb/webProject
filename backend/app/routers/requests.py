from fastapi import APIRouter, HTTPException, Query, Body, Header, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.database import (
    requests_collection, 
    performance_logs_collection,
    comments_collection,
    ratings_collection,
    citizens_collection,
    db
)
from app.models import ServiceRequest, ServiceRequestResponse, Comment, Rating
import uuid
import os
from datetime import time

router = APIRouter()

# Workflow state machine rules
WORKFLOW_TRANSITIONS = {
    "new": ["triaged", "closed"],
    "triaged": ["assigned", "closed"],
    "assigned": ["in_progress", "triaged", "closed"],
    "in_progress": ["resolved", "assigned"],
    "resolved": ["closed"],
    "closed": []
}

# SLA policies by category and priority
SLA_POLICIES = {
    ("pothole", "P1"): {"policy_id": "SLA-ROAD-P1", "target_hours": 48, "breach_threshold_hours": 60},
    ("pothole", "P2"): {"policy_id": "SLA-ROAD-P2", "target_hours": 72, "breach_threshold_hours": 96},
    ("water_leak", "P1"): {"policy_id": "SLA-WATER-P1", "target_hours": 24, "breach_threshold_hours": 36},
    ("streetlight", "P2"): {"policy_id": "SLA-LIGHT-P2", "target_hours": 120, "breach_threshold_hours": 144},
    "default": {"policy_id": "SLA-DEFAULT", "target_hours": 96, "breach_threshold_hours": 120}
}

def generate_request_id() -> str:
    """Generate unique request ID in CST-2026-XXXX format"""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"CST-2026-{timestamp[-8:]}"

def get_sla_policy(category: str, priority: str) -> Dict[str, Any]:
    """Get SLA policy based on category and priority"""
    policy = SLA_POLICIES.get((category.lower(), priority), SLA_POLICIES["default"]).copy()
    policy["escalation_steps"] = [
        {"after_hours": int(policy["target_hours"] * 0.75), "action": "notify_dispatcher"},
        {"after_hours": policy["breach_threshold_hours"], "action": "notify_manager"}
    ]
    return policy

def validate_transition(current_state: str, new_state: str) -> bool:
    """Validate if state transition is allowed"""
    allowed = WORKFLOW_TRANSITIONS.get(current_state, [])
    return new_state in allowed


# ===== Module 3 helpers (kept local to avoid circular imports) =====

def _require_staff(x_staff_key: str | None = Header(default=None)):
    expected = os.getenv("STAFF_API_KEY")
    if expected and (not x_staff_key or x_staff_key != expected):
        raise HTTPException(status_code=403, detail="Staff key required")
    return True


def _parse_hhmm(s: str) -> time:
    h, m = s.split(":")
    return time(hour=int(h), minute=int(m))


def _is_on_shift(agent: dict) -> bool:
    now = datetime.utcnow()
    day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][now.weekday()]
    t = now.time()
    for s in agent.get("schedule", []):
        if s.get("day") == day:
            st = _parse_hhmm(s.get("start", "00:00"))
            en = _parse_hhmm(s.get("end", "23:59"))
            if st <= t <= en:
                return True
    return False


def _category_to_skill(category: str) -> str:
    mapping = {"pothole": "road", "streetlight": "road", "water_leak": "water", "missed_trash": "waste"}
    return mapping.get(category, category)


def _current_workload(agent_id: str) -> int:
    return requests_collection.count_documents({
        "assignment.assigned_agent_id": agent_id,
        "status": {"$in": ["assigned", "in_progress"]}
    })


# ===== Module 3 endpoints at /requests/... =====

@router.post("/{request_id}/auto-assign", dependencies=[Depends(_require_staff)])
async def auto_assign_request(request_id: str):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    req = requests_collection.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    zone = (req.get("location") or {}).get("zone_id")
    needed = _category_to_skill(req.get("category", ""))

    query: dict[str, Any] = {"skills": needed}
    if zone:
        query["coverage_zones"] = zone
    candidates = list(db["service_agents"].find(query))
    if not candidates:
        # relax zone filter
        candidates = list(db["service_agents"].find({"skills": needed}))
    if not candidates:
        raise HTTPException(status_code=409, detail="No matching agents available")

    on_shift = [a for a in candidates if _is_on_shift(a)]
    pool = on_shift or candidates
    ranked = sorted(pool, key=lambda a: _current_workload(str(a["_id"])))
    chosen = ranked[0]

    now = datetime.utcnow()
    updates: dict[str, Any] = {
        "assignment.assigned_agent_id": str(chosen["_id"]),
        "assignment.assignment_policy": "zone+skill+workload+availability",
        "timestamps.assigned_at": now,
        "timestamps.updated_at": now,
    }
    if req.get("status") not in ("assigned", "in_progress", "resolved", "closed"):
        updates["status"] = "assigned"
    requests_collection.update_one({"_id": req["_id"]}, {"$set": updates})

    # log
    event = {
        "type": "assigned",
        "by": {"actor_type": "dispatcher", "actor_id": "auto"},
        "at": now,
        "meta": {"agent_id": str(chosen["_id"]), "policy": "auto"}
    }
    log = performance_logs_collection.find_one({"request_id": req["_id"]})
    if log:
        performance_logs_collection.update_one({"_id": log["_id"]}, {"$push": {"event_stream": event}})
    else:
        performance_logs_collection.insert_one({"request_id": req["_id"]},)
        performance_logs_collection.update_one({"request_id": req["_id"]}, {"$set": {"created_at": now}, "$push": {"event_stream": event}})

    return {"message": "assigned", "agent_id": str(chosen["_id"]), "agent_name": chosen.get("name")}


@router.patch("/{request_id}/milestone")
async def add_milestone_request(request_id: str, payload: Dict[str, Any], x_agent_id: Optional[str] = Header(default=None, alias="X-Agent-Id")):
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    req = requests_collection.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not x_agent_id or not ObjectId.is_valid(x_agent_id):
        raise HTTPException(status_code=403, detail="Agent header required")
    agent = db["service_agents"].find_one({"_id": ObjectId(x_agent_id)})
    if not agent:
        raise HTTPException(status_code=403, detail="Agent not found")
    assigned_id = ((req.get("assignment") or {}).get("assigned_agent_id"))
    if assigned_id != x_agent_id:
        raise HTTPException(status_code=403, detail="Agent not assigned to this request")

    mtype = payload.get("type")
    if mtype not in ("arrived", "work_started", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid milestone type")
    now = datetime.utcnow()
    # status transitions
    if mtype == "work_started" and req.get("status") == "assigned":
        requests_collection.update_one({"_id": req["_id"]}, {"$set": {"status": "in_progress", "timestamps.updated_at": now}})
    if mtype == "resolved":
        requests_collection.update_one({"_id": req["_id"]}, {"$set": {"status": "resolved", "timestamps.resolved_at": now, "timestamps.updated_at": now}})

    event = {
        "type": mtype,
        "by": {"actor_type": "agent", "actor_id": x_agent_id},
        "at": now,
        "meta": {k: v for k, v in payload.items() if k in ("checklist", "evidence")}
    }
    log = performance_logs_collection.find_one({"request_id": req["_id"]})
    if log:
        performance_logs_collection.update_one({"_id": log["_id"]}, {"$push": {"event_stream": event}})
    else:
        performance_logs_collection.insert_one({"request_id": req["_id"], "event_stream": [event], "created_at": now})

    return {"message": "Milestone recorded", "type": mtype, "at": now.isoformat()}


@router.post("/", response_model=ServiceRequestResponse, status_code=201)
async def create_request(
    request: ServiceRequest,
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """Create a new service request with idempotency support"""
    
    # Check idempotency
    if idempotency_key:
        existing = requests_collection.find_one({"idempotency_key": idempotency_key})
        if existing:
            existing["_id"] = str(existing["_id"])
            return ServiceRequestResponse(**existing)
    
    request_dict = request.dict(by_alias=True, exclude={"id"})
    
    # Generate request ID
    request_dict["request_id"] = generate_request_id()
    
    # Set initial workflow state
    request_dict["status"] = "new"
    request_dict["workflow"] = {
        "current_state": "new",
        "allowed_next": WORKFLOW_TRANSITIONS["new"],
        "transition_rules_version": "v1.2"
    }
    
    # Compute and assign SLA policy
    sla_policy = get_sla_policy(request_dict.get("category", ""), request_dict.get("priority", "P2"))
    request_dict["sla_policy"] = sla_policy
    
    # Initialize timestamps
    now = datetime.utcnow()
    request_dict["timestamps"] = {
        "created_at": now,
        "triaged_at": None,
        "assigned_at": None,
        "resolved_at": None,
        "closed_at": None,
        "updated_at": now
    }
    
    # Initialize duplicates tracking
    if "duplicates" not in request_dict:
        request_dict["duplicates"] = {
            "is_master": True,
            "master_request_id": None,
            "linked_duplicates": []
        }
    
    # Initialize internal notes
    if "internal_notes" not in request_dict:
        request_dict["internal_notes"] = []
    
    # Add idempotency key if provided
    if idempotency_key:
        request_dict["idempotency_key"] = idempotency_key
    
    result = requests_collection.insert_one(request_dict)
    created_request = requests_collection.find_one({"_id": result.inserted_id})
    
    # Create performance log entry
    performance_logs_collection.insert_one({
        "request_id": result.inserted_id,
        "event_stream": [{
            "type": "created",
            "by": {"actor_type": "citizen", "actor_id": str(request_dict.get("citizen_ref", {}).get("citizen_id", "anonymous"))},
            "at": now,
            "meta": {"channel": "web", "category": request_dict.get("category")}
        }],
        "computed_kpis": {
            "resolution_minutes": None,
            "sla_target_hours": sla_policy["target_hours"],
            "sla_state": "on_track",
            "escalation_count": 0
        },
        "created_at": now
    })
    
    # Convert ObjectId to string for response
    created_request["_id"] = str(created_request["_id"])
    
    return ServiceRequestResponse(**created_request)


@router.get("/", response_model=List[ServiceRequestResponse])
async def get_requests(
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    zone_id: Optional[str] = Query(None, description="Filter by zone"),
    skip: int = Query(0, ge=0, description="Skip records for pagination"),
    limit: int = Query(100, ge=1, le=1000, description="Limit records")
):
    """Get all service requests with filters and pagination"""
    query = {}
    
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    if zone_id:
        query["location.zone_id"] = zone_id
    
    requests = list(
        requests_collection.find(query)
        .skip(skip)
        .limit(limit)
        .sort("timestamps.created_at", -1)
    )
    
    # Convert ObjectId to string for response
    for req in requests:
        req["_id"] = str(req["_id"])
    
    return [ServiceRequestResponse(**req) for req in requests]


@router.get("/{request_id}", response_model=ServiceRequestResponse)
async def get_request(request_id: str):
    """Get a single service request by ID"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID format")
    
    request = requests_collection.find_one({"_id": ObjectId(request_id)})
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Convert ObjectId to string for response
    request["_id"] = str(request["_id"])
    
    return ServiceRequestResponse(**request)


@router.put("/{request_id}", response_model=ServiceRequestResponse)
async def update_request(request_id: str, request_update: ServiceRequest):
    """Update a service request"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID format")
    
    existing_request = requests_collection.find_one({"_id": ObjectId(request_id)})
    
    if not existing_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_dict = request_update.dict(by_alias=True, exclude={"id", "created_at"})
    update_dict["updated_at"] = datetime.utcnow()
    
    requests_collection.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": update_dict}
    )
    
    updated_request = requests_collection.find_one({"_id": ObjectId(request_id)})
    
    # Convert ObjectId to string for response
    updated_request["_id"] = str(updated_request["_id"])
    
    return ServiceRequestResponse(**updated_request)


@router.patch("/{request_id}/status")
async def update_status(request_id: str, status: str = Query(..., pattern="^(pending|in_progress|resolved)$")):
    """Update only the status of a request"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID format")
    
    result = requests_collection.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    updated_request = requests_collection.find_one({"_id": ObjectId(request_id)})
    
    # Convert ObjectId to string for response
    updated_request["_id"] = str(updated_request["_id"])
    
    return ServiceRequestResponse(**updated_request)


@router.delete("/{request_id}")
async def delete_request(request_id: str):
    """Delete a service request"""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID format")
    
    result = requests_collection.delete_one({"_id": ObjectId(request_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Request deleted successfully"}


@router.patch("/{request_id}/transition")
async def transition_request(
    request_id: str,
    new_state: str = Body(..., embed=True),
    actor_type: str = Body("staff", embed=True),
    actor_id: str = Body(..., embed=True),
    notes: Optional[str] = Body(None, embed=True)
):
    """
    Transition request to new workflow state with validation.
    Validates state machine rules and updates timestamps accordingly.
    """
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID format")
    
    request = requests_collection.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    current_state = request.get("workflow", {}).get("current_state", request.get("status", "new"))
    
    # Validate transition
    if not validate_transition(current_state, new_state):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from '{current_state}' to '{new_state}'. Allowed transitions: {WORKFLOW_TRANSITIONS.get(current_state, [])}"
        )
    
    # Prepare update
    now = datetime.utcnow()
    update_data = {
        "status": new_state,
        "workflow.current_state": new_state,
        "workflow.allowed_next": WORKFLOW_TRANSITIONS.get(new_state, []),
        f"timestamps.updated_at": now
    }
    
    # Update specific timestamps based on state
    timestamp_field = None
    if new_state == "triaged":
        timestamp_field = "timestamps.triaged_at"
    elif new_state == "assigned":
        timestamp_field = "timestamps.assigned_at"
    elif new_state == "resolved":
        timestamp_field = "timestamps.resolved_at"
    elif new_state == "closed":
        timestamp_field = "timestamps.closed_at"
    
    if timestamp_field:
        update_data[timestamp_field] = now
    
    # Add internal note if provided
    if notes:
        requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$push": {"internal_notes": f"[{new_state}] {notes}"}}
        )
    
    # Update request
    requests_collection.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": update_data}
    )
    
    # Log transition in performance log
    performance_logs_collection.update_one(
        {"request_id": ObjectId(request_id)},
        {
            "$push": {
                "event_stream": {
                    "type": new_state,
                    "by": {"actor_type": actor_type, "actor_id": actor_id},
                    "at": now,
                    "meta": {"notes": notes} if notes else {}
                }
            }
        },
        upsert=True
    )
    
    # Get updated request
    updated_request = requests_collection.find_one({"_id": ObjectId(request_id)})
    updated_request["_id"] = str(updated_request["_id"])
    
    return ServiceRequestResponse(**updated_request)


@router.post("/{request_id}/escalate")
async def escalate_request(
    request_id: str,
    reason: str = Body(..., embed=True),
    escalated_by: str = Body(..., embed=True),
    escalation_level: str = Body("manager", embed=True)
):
    """
    Manually escalate a request (override automatic SLA escalation).
    Adds escalation event to audit trail.
    """
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID format")
    
    request = requests_collection.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    now = datetime.utcnow()
    
    # Add escalation note
    escalation_note = f"[ESCALATED to {escalation_level}] {reason} - By: {escalated_by}"
    requests_collection.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$push": {"internal_notes": escalation_note},
            "$set": {"timestamps.updated_at": now}
        }
    )
    
    # Log escalation event
    performance_logs_collection.update_one(
        {"request_id": ObjectId(request_id)},
        {
            "$push": {
                "event_stream": {
                    "type": "manual_escalation",
                    "by": {"actor_type": "staff", "actor_id": escalated_by},
                    "at": now,
                    "meta": {
                        "reason": reason,
                        "escalation_level": escalation_level
                    }
                }
            },
            "$inc": {"computed_kpis.escalation_count": 1}
        },
        upsert=True
    )
    
    return {
        "message": "Request escalated successfully",
        "request_id": request_id,
        "escalation_level": escalation_level,
        "escalated_at": now
    }


@router.get("/nearby/search")
async def get_nearby_requests(
    longitude: float = Query(..., ge=-180, le=180),
    latitude: float = Query(..., ge=-90, le=90),
    max_distance: int = Query(5000, ge=100, le=50000, description="Maximum distance in meters")
):
    """Get service requests near a location"""
    requests = list(requests_collection.find({
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "$maxDistance": max_distance
            }
        }
    }).limit(50))
    
    for req in requests:
        req["_id"] = str(req["_id"])
        if req.get("assignment", {}).get("assigned_agent_id"):
            req["assignment"]["assigned_agent_id"] = str(req["assignment"]["assigned_agent_id"])
    
    return {"count": len(requests), "requests": requests}


# ==================== Module 2: Citizen Interaction Endpoints ====================

@router.post("/{request_id}/comment")
async def add_comment(request_id: str, comment_data: dict):
    """Add a citizen comment to a request (threaded support)"""
    try:
        # Verify request exists
        request = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Validate required fields
        if "author_id" not in comment_data or "author_type" not in comment_data or "content" not in comment_data:
            raise HTTPException(status_code=400, detail="Missing required fields: author_id, author_type, content")
        
        # Verify author exists
        author_id = comment_data["author_id"]
        author_type = comment_data["author_type"]
        author_name = "Unknown"
        
        if author_type == "citizen":
            citizen = citizens_collection.find_one({"_id": ObjectId(author_id)})
            if not citizen:
                raise HTTPException(status_code=404, detail="Citizen not found")
            author_name = citizen.get("full_name", "Anonymous")
        
        # Verify parent comment if threaded
        parent_comment_id = comment_data.get("parent_comment_id")
        if parent_comment_id:
            parent = comments_collection.find_one({"_id": ObjectId(parent_comment_id)})
            if not parent:
                raise HTTPException(status_code=404, detail="Parent comment not found")
        
        # Create comment
        comment = {
            "request_id": ObjectId(request_id),
            "author_type": author_type,
            "author_id": ObjectId(author_id),
            "author_name": author_name,
            "content": comment_data["content"],
            "parent_comment_id": ObjectId(parent_comment_id) if parent_comment_id else None,
            "is_internal": comment_data.get("is_internal", False),
            "created_at": datetime.utcnow()
        }
        
        result = comments_collection.insert_one(comment)
        comment["_id"] = str(result.inserted_id)
        comment["request_id"] = str(comment["request_id"])
        comment["author_id"] = str(comment["author_id"])
        if comment["parent_comment_id"]:
            comment["parent_comment_id"] = str(comment["parent_comment_id"])
        
        return {
            "message": "Comment added successfully",
            "comment": comment
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{request_id}/comments")
async def get_comments(request_id: str, include_internal: bool = False):
    """Get all comments for a request"""
    try:
        # Verify request exists
        request = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Build query
        query = {"request_id": ObjectId(request_id)}
        if not include_internal:
            query["is_internal"] = False
        
        # Get comments
        comments = list(comments_collection.find(query).sort("created_at", 1))
        
        # Convert ObjectIds
        for comment in comments:
            comment["_id"] = str(comment["_id"])
            comment["request_id"] = str(comment["request_id"])
            comment["author_id"] = str(comment["author_id"])
            if comment.get("parent_comment_id"):
                comment["parent_comment_id"] = str(comment["parent_comment_id"])
        
        return {
            "request_id": request_id,
            "total_comments": len(comments),
            "comments": comments
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/rating")
async def add_rating(request_id: str, rating_data: dict):
    """Rate a resolved request with stars and optional dispute flag"""
    try:
        # Verify request exists and is resolved
        request = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if request.get("status") not in ["resolved", "closed"]:
            raise HTTPException(status_code=400, detail="Can only rate resolved or closed requests")
        
        # Validate required fields
        if "citizen_id" not in rating_data or "stars" not in rating_data:
            raise HTTPException(status_code=400, detail="Missing required fields: citizen_id, stars")
        
        citizen_id = rating_data["citizen_id"]
        stars = rating_data["stars"]
        
        # Validate citizen exists
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        # Validate stars range
        if not (1 <= stars <= 5):
            raise HTTPException(status_code=400, detail="Stars must be between 1 and 5")
        
        # Check if rating already exists
        existing = ratings_collection.find_one({"request_id": ObjectId(request_id)})
        if existing:
            raise HTTPException(status_code=400, detail="Request already rated. Use update endpoint to modify.")
        
        # Create rating
        rating = {
            "request_id": ObjectId(request_id),
            "citizen_id": ObjectId(citizen_id),
            "stars": stars,
            "reason_code": rating_data.get("reason_code"),
            "comment": rating_data.get("comment"),
            "dispute_flag": rating_data.get("dispute_flag", False),
            "dispute_reason": rating_data.get("dispute_reason"),
            "created_at": datetime.utcnow()
        }
        
        result = ratings_collection.insert_one(rating)
        
        # Update performance log with rating
        performance_logs_collection.update_one(
            {"request_id": ObjectId(request_id)},
            {
                "$set": {
                    "citizen_feedback": {
                        "rating": stars,
                        "reason_code": rating_data.get("reason_code"),
                        "dispute_flag": rating_data.get("dispute_flag", False),
                        "rated_at": datetime.utcnow()
                    }
                }
            },
            upsert=True
        )
        
        # Update citizen's average rating
        citizen_ratings = list(ratings_collection.find({"citizen_id": ObjectId(citizen_id)}))
        if citizen_ratings:
            avg_rating = sum(r["stars"] for r in citizen_ratings) / len(citizen_ratings)
            citizens_collection.update_one(
                {"_id": ObjectId(citizen_id)},
                {"$set": {"avg_rating": round(avg_rating, 2)}}
            )
        
        rating["_id"] = str(result.inserted_id)
        rating["request_id"] = str(rating["request_id"])
        rating["citizen_id"] = str(rating["citizen_id"])
        
        return {
            "message": "Rating submitted successfully",
            "rating": rating
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{request_id}/rating")
async def get_rating(request_id: str):
    """Get rating for a request"""
    try:
        rating = ratings_collection.find_one({"request_id": ObjectId(request_id)})
        if not rating:
            return {"message": "No rating found for this request"}
        
        rating["_id"] = str(rating["_id"])
        rating["request_id"] = str(rating["request_id"])
        rating["citizen_id"] = str(rating["citizen_id"])
        
        return rating
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/evidence")
async def add_evidence(request_id: str, evidence_data: dict):
    """Add additional evidence to a request (photos, videos, documents)"""
    try:
        # Verify request exists
        request = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Validate evidence data
        if "type" not in evidence_data or "url" not in evidence_data:
            raise HTTPException(status_code=400, detail="Missing required fields: type, url")
        
        if evidence_data["type"] not in ["photo", "video", "document"]:
            raise HTTPException(status_code=400, detail="Invalid evidence type. Must be: photo, video, or document")
        
        # Create evidence object
        evidence = {
            "type": evidence_data["type"],
            "url": evidence_data["url"],
            "sha256": evidence_data.get("sha256"),
            "uploaded_by": evidence_data.get("uploaded_by", "citizen"),
            "uploaded_at": datetime.utcnow()
        }
        
        # Add to request's evidence array
        result = requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$push": {"evidence": evidence}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to add evidence")
        
        return {
            "message": "Evidence added successfully",
            "evidence": evidence
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{request_id}/evidence")
async def get_evidence(request_id: str):
    """Get all evidence for a request"""
    try:
        request = requests_collection.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        evidence = request.get("evidence", [])
        
        return {
            "request_id": request_id,
            "total_evidence": len(evidence),
            "evidence": evidence
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
