from fastapi import APIRouter, HTTPException, Query, Body, Header
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.database import requests_collection, performance_logs_collection
from app.models import ServiceRequest, ServiceRequestResponse
import uuid

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
    
    return [ServiceRequestResponse(**req) for req in requests]
