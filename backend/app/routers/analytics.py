from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Any, Dict, List, Optional
from bson import ObjectId

from app.database import (
    requests_collection,
    performance_logs_collection,
    geo_feeds_collection,
    db,
)

router = APIRouter()


OPEN_STATUSES = ["new", "triaged", "assigned", "in_progress"]


def _parse_date(val: Optional[str]) -> Optional[datetime]:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601 (e.g., 2026-01-23T00:00:00)")


def _build_match(category: Optional[str], zone: Optional[str], start: Optional[str], end: Optional[str]):
    match: Dict[str, Any] = {}
    if category:
        match["category"] = category
    if zone:
        match["location.zone_id"] = zone
    start_dt = _parse_date(start)
    end_dt = _parse_date(end)
    if start_dt or end_dt:
        created_range: Dict[str, Any] = {}
        if start_dt:
            created_range["$gte"] = start_dt
        if end_dt:
            created_range["$lte"] = end_dt
        match["timestamps.created_at"] = created_range
    return match


@router.get("/kpis")
async def kpis(
    category: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Return high-level KPIs for the dashboard."""
    match = _build_match(category, zone, start_date, end_date)

    status_pipeline = [
        {"$match": match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_counts = {doc["_id"]: doc["count"] for doc in requests_collection.aggregate(status_pipeline)}

    res_match = match | {"status": {"$in": ["resolved", "closed"]}}
    res_pipeline = [
        {"$match": res_match},
        {
            "$project": {
                "created_at": "$timestamps.created_at",
                "resolved_at": "$timestamps.resolved_at",
            }
        },
        {"$match": {"resolved_at": {"$ne": None}, "created_at": {"$ne": None}}},
        {
            "$project": {
                "hours": {
                    "$divide": [
                        {"$subtract": ["$resolved_at", "$created_at"]},
                        1000 * 60 * 60,
                    ]
                }
            }
        },
        {"$group": {"_id": None, "avg_hours": {"$avg": "$hours"}}},
    ]
    avg_resolution_doc = list(requests_collection.aggregate(res_pipeline))
    avg_resolution_hours = avg_resolution_doc[0]["avg_hours"] if avg_resolution_doc else None

    sla_pipeline = [
        {"$match": match},
        {
            "$project": {
                "status": 1,
                "created_at": "$timestamps.created_at",
                "resolved_at": "$timestamps.resolved_at",
                "breach_threshold": "$sla_policy.breach_threshold_hours",
            }
        },
        {
            "$project": {
                "breached": {
                    "$cond": [
                        {
                            "$and": [
                                {"$ne": ["$resolved_at", None]},
                                {"$ne": ["$created_at", None]},
                                {
                                    "$gt": [
                                        {
                                            "$divide": [
                                                {"$subtract": ["$resolved_at", "$created_at"]},
                                                1000 * 60 * 60,
                                            ]
                                        },
                                        "$breach_threshold",
                                    ]
                                },
                            ]
                        },
                        1,
                        0,
                    ]
                },
            }
        },
        {"$group": {"_id": None, "breached": {"$sum": "$breached"}, "total": {"$sum": 1}}},
    ]
    sla_doc = list(requests_collection.aggregate(sla_pipeline))
    sla_breach_rate = None
    if sla_doc:
        total = sla_doc[0].get("total", 0) or 0
        breached = sla_doc[0].get("breached", 0)
        sla_breach_rate = breached / total if total else None

    return {
        "backlog": status_counts,
        "avg_resolution_hours": avg_resolution_hours,
        "sla_breach_rate": sla_breach_rate,
    }


@router.get("/geofeeds/heatmap")
async def heatmap(
    category: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Return GeoJSON heat-map feed of open requests and store a snapshot in geo_feeds."""
    match = _build_match(category, zone, start_date, end_date)
    match["status"] = {"$in": OPEN_STATUSES}

    cursor = requests_collection.find(match, {
        "location": 1,
        "priority": 1,
        "timestamps": 1,
        "category": 1,
        "status": 1,
    })

    features: List[Dict[str, Any]] = []
    now = datetime.utcnow()
    for doc in cursor:
        loc = doc.get("location") or {}
        coords = loc.get("coordinates")
        if not coords or len(coords) != 2:
            continue
        created = (doc.get("timestamps") or {}).get("created_at") or now
        age_hours = max((now - created).total_seconds() / 3600, 0)
        priority = (doc.get("priority") or "P3").upper()
        p_weight = {"P0": 4.0, "P1": 3.0, "P2": 2.0, "P3": 1.0}.get(priority, 1.0)
        weight = p_weight * (1 + (age_hours ** 0.5))
        features.append({
            "type": "Feature",
            "properties": {
                "request_id": str(doc.get("_id")),
                "category": doc.get("category"),
                "priority": priority,
                "status": doc.get("status"),
                "weight": round(weight, 3),
                "age_hours": round(age_hours, 2),
            },
            "geometry": {
                "type": "Point",
                "coordinates": coords,
            },
        })

    geojson = {"type": "FeatureCollection", "features": features}

    geo_feeds_collection.insert_one({
        "feed_name": "open_requests_heatmap",
        "generated_at": now,
        "filters": {
            "category": category,
            "zone": zone,
            "start_date": start_date,
            "end_date": end_date,
        },
        "geojson": geojson,
        "created_at": now,
    })

    return geojson


@router.get("/cohorts")
async def cohorts(
    category: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Return requests over time (month buckets) and hotspot counts by zone."""
    match = _build_match(category, zone, start_date, end_date)

    time_pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$timestamps.created_at"},
                    "month": {"$month": "$timestamps.created_at"},
                },
                "count": {"$sum": 1},
                "resolved": {
                    "$sum": {
                        "$cond": [
                            {"$in": ["$status", ["resolved", "closed"]]},
                            1,
                            0,
                        ]
                    }
                },
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]

    time_series = [
        {
            "year": doc["_id"]["year"],
            "month": doc["_id"]["month"],
            "count": doc["count"],
            "resolved": doc["resolved"],
        }
        for doc in db["service_requests"].aggregate(time_pipeline)
    ]

    hotspot_pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": "$location.zone_id",
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]

    hotspots = [
        {"zone_id": doc["_id"], "count": doc["count"]}
        for doc in db["service_requests"].aggregate(hotspot_pipeline)
    ]

    return {"time_series": time_series, "hotspots": hotspots}


@router.get("/agents")
async def agent_productivity(
    zone: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Return agent workload and performance summary."""
    match = _build_match(None, zone, start_date, end_date)

    pipeline = [
        {"$match": match},
        {"$match": {"assignment.assigned_agent_id": {"$ne": None}}},
        {
            "$group": {
                "_id": "$assignment.assigned_agent_id",
                "open": {
                    "$sum": {
                        "$cond": [
                            {"$in": ["$status", OPEN_STATUSES]},
                            1,
                            0,
                        ]
                    }
                },
                "resolved": {
                    "$sum": {
                        "$cond": [
                            {"$in": ["$status", ["resolved", "closed"]]},
                            1,
                            0,
                        ]
                    }
                },
            }
        },
        {"$sort": {"open": -1}},
    ]

    agents = list(db["service_agents"].find({}))
    agent_lookup = {str(a.get("_id")): a.get("name") for a in agents}

    results = []
    for doc in db["service_requests"].aggregate(pipeline):
        agent_id = str(doc["_id"])  
        results.append({
            "agent_id": agent_id,
            "agent_name": agent_lookup.get(agent_id, "Unknown"),
            "open": doc.get("open", 0),
            "resolved": doc.get("resolved", 0),
        })

    return {"agents": results}
