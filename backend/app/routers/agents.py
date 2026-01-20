from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, time
import os
from bson import ObjectId

from app.database import db

router = APIRouter()


def convert_objectids(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, list):
        return [convert_objectids(x) for x in obj]
    if isinstance(obj, dict):
        return {k: convert_objectids(v) for k, v in obj.items()}
    return obj


# ========= Basic Access Control =========

def require_staff(x_staff_key: Optional[str] = Header(default=None)):
    expected = os.getenv("STAFF_API_KEY")
    if expected:
        if not x_staff_key or x_staff_key != expected:
            raise HTTPException(status_code=403, detail="Staff key required")
    return True


def get_agent_from_header(x_agent_id: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    if not x_agent_id or not ObjectId.is_valid(x_agent_id):
        raise HTTPException(status_code=403, detail="Agent header missing or invalid")
    agent = db["service_agents"].find_one({"_id": ObjectId(x_agent_id)})
    if not agent:
        raise HTTPException(status_code=403, detail="Agent not found")
    return agent


# ========= Helpers =========

def now_utc():
    return datetime.utcnow()


def parse_hhmm(s: str) -> time:
    h, m = s.split(":")
    return time(hour=int(h), minute=int(m))


def is_on_shift(agent: Dict[str, Any], ref: Optional[datetime] = None) -> bool:
    ref = ref or now_utc()
    schedule = agent.get("schedule", [])
    # Expect schedule items: { day: "Mon", start: "08:00", end: "16:00" }
    day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][ref.weekday()]
    t = ref.time()
    for s in schedule:
        if s.get("day") == day:
            st = parse_hhmm(s.get("start", "00:00"))
            en = parse_hhmm(s.get("end", "23:59"))
            if st <= t <= en:
                return True
    return False


def category_to_skill(category: str) -> str:
    mapping = {
        "pothole": "road",
        "streetlight": "road",
        "water_leak": "water",
        "missed_trash": "waste",
    }
    return mapping.get(category, category)


def current_workload(agent_id: ObjectId) -> int:
    return db["service_requests"].count_documents({
        "assignment.assigned_agent_id": str(agent_id),
        "status": {"$in": ["assigned", "in_progress"]}
    })


# ========= Endpoints =========

@router.get("/")
async def list_agents(skill: Optional[str] = None, zone: Optional[str] = None):
    query: Dict[str, Any] = {}
    if skill:
        query["skills"] = skill
    if zone:
        query["coverage_zones"] = zone
    agents = list(db["service_agents"].find(query))
    for a in agents:
        a["_id"] = str(a["_id"])
    return agents

@router.post("/", dependencies=[Depends(require_staff)])
async def add_agent(payload: Dict[str, Any]):
    """Create a service agent/team with coverage, skills, and schedule.
    Example payload:
    {
      "name": "Team Alpha",
      "type": "team",  # or "agent"
      "skills": ["road", "water"],
      "coverage_zones": ["ZONE-DT-01", "ZONE-N-03"],
      "schedule": [ {"day":"Mon","start":"08:00","end":"16:00"}, ... ]
    }
    """
    agent = {
        "name": payload.get("name"),
        "type": payload.get("type", "agent"),
        "skills": payload.get("skills", []),
        "coverage_zones": payload.get("coverage_zones", []),
        "schedule": payload.get("schedule", []),
        "created_at": now_utc(),
        "active": True,
    }
    if not agent["name"]:
        raise HTTPException(status_code=400, detail="name is required")
    res = db["service_agents"].insert_one(agent)
    agent_doc = db["service_agents"].find_one({"_id": res.inserted_id})
    agent_doc["_id"] = str(agent_doc["_id"])
    return agent_doc


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=400, detail="Invalid agent id")
    agent = db["service_agents"].find_one({"_id": ObjectId(agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Workload and performance summary
    workload = current_workload(ObjectId(agent_id))
    # Simple performance summary: counts by event type from performance_logs where meta.agent_id == agent_id
    pipeline = [
        {"$unwind": "$event_stream"},
        {"$match": {"event_stream.meta.agent_id": agent_id}},
        {"$group": {"_id": "$event_stream.type", "count": {"$sum": 1}}}
    ]
    perf = list(db["performance_logs"].aggregate(pipeline))
    perf_summary = {x["_id"]: x["count"] for x in perf}

    agent["_id"] = str(agent["_id"])
    return {
        "agent": convert_objectids(agent),
        "metrics": {
            "workload_open": workload,
            "performance": perf_summary
        }
    }


@router.post("/assign/{request_id}", dependencies=[Depends(require_staff)])
async def auto_assign(request_id: str):
    """Automatic assignment based on: zone match + skill match + on-shift + lowest workload."""
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    req = db["service_requests"].find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    zone = (req.get("location") or {}).get("zone_id")
    skill_needed = category_to_skill(req.get("category", ""))

    candidates = list(db["service_agents"].find({
        "skills": skill_needed,
        **({"coverage_zones": zone} if zone else {})
    }))

    # Filter to those on-shift
    on_shift = [a for a in candidates if is_on_shift(a)]
    pool = on_shift or candidates
    if not pool:
        raise HTTPException(status_code=409, detail="No matching agents available")

    # Pick with minimal workload
    ranked = sorted(pool, key=lambda a: current_workload(a["_id"]))
    chosen = ranked[0]

    # Update request
    now = now_utc()
    updates = {
        "assignment.assigned_agent_id": str(chosen["_id"]),
        "assignment.assignment_policy": "zone+skill+workload+availability",
        "timestamps.assigned_at": now,
    }
    new_status = None
    if req.get("status") not in ("assigned", "in_progress", "resolved", "closed"):
        new_status = "assigned"
        updates["status"] = new_status

    db["service_requests"].update_one({"_id": req["_id"]}, {"$set": updates})

    # Log performance event
    log = db["performance_logs"].find_one({"request_id": req["_id"]})
    event = {
        "type": "assigned",
        "by": {"actor_type": "dispatcher", "actor_id": "auto"},
        "at": now,
        "meta": {"agent_id": str(chosen["_id"]), "policy": "auto"}
    }
    if log:
        db["performance_logs"].update_one({"_id": log["_id"]}, {"$push": {"event_stream": event}})
    else:
        db["performance_logs"].insert_one({
            "request_id": req["_id"],
            "event_stream": [event],
            "created_at": now
        })

    return {
        "message": "Request assigned",
        "agent_id": str(chosen["_id"]),
        "agent_name": chosen.get("name"),
        "status": new_status or req.get("status")
    }


@router.patch("/milestone/{request_id}")
async def add_milestone(request_id: str, payload: Dict[str, Any], agent=Depends(get_agent_from_header)):
    """Add milestone event by the assigned agent.
    Headers: X-Agent-Id: <agent_id>
    Body: { "type": "arrived|work_started|resolved", "checklist": {...}, "evidence": [..] }
    """
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request id")
    req = db["service_requests"].find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    assigned_id = ((req.get("assignment") or {}).get("assigned_agent_id"))
    if not assigned_id or assigned_id != str(agent["_id"]):
        raise HTTPException(status_code=403, detail="Agent not assigned to this request")

    mtype = payload.get("type")
    if mtype not in ("arrived", "work_started", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid milestone type")

    now = now_utc()
    meta = {
        "agent_id": str(agent["_id"]),
    }
    if payload.get("checklist"):
        meta["checklist"] = payload["checklist"]
    if payload.get("evidence"):
        meta["evidence"] = payload["evidence"]

    # Update request status/timestamps for resolved
    if mtype == "work_started" and req.get("status") == "assigned":
        db["service_requests"].update_one({"_id": req["_id"]}, {"$set": {"status": "in_progress", "timestamps.updated_at": now}})
    if mtype == "resolved":
        db["service_requests"].update_one({"_id": req["_id"]}, {"$set": {"status": "resolved", "timestamps.resolved_at": now, "timestamps.updated_at": now}})

    # Append log event
    log = db["performance_logs"].find_one({"request_id": req["_id"]})
    event = {"type": mtype, "by": {"actor_type": "agent", "actor_id": str(agent["_id"])}, "at": now, "meta": meta}
    if log:
        db["performance_logs"].update_one({"_id": log["_id"]}, {"$push": {"event_stream": event}})
    else:
        db["performance_logs"].insert_one({"request_id": req["_id"], "event_stream": [event], "created_at": now})

    return {"message": "Milestone recorded", "type": mtype, "at": now.isoformat()}
