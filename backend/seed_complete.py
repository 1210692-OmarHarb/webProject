"""
Complete seed script for CST - Matches project specification exactly
Run this to populate all collections with spec-compliant sample data
"""
from datetime import datetime, timedelta
from bson import ObjectId
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.database import db

def seed_all():
    """Seed all collections with complete data matching spec"""
    
    print("=" * 50)
    print("🌱 CST Complete Database Seeding")
    print("=" * 50)
    
    # Clear all collections
    print("\n🗑️  Clearing existing data...")
    db["service_requests"].delete_many({})
    db["performance_logs"].delete_many({})
    db["categories"].delete_many({})
    
    # Seed Categories
    print("\n📁 Seeding categories...")
    categories = [
        {
            "name": "pothole",
            "description": "Road damage and asphalt issues",
            "icon": "🚧",
            "department": "Public Works",
            "active": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "water_leak",
            "description": "Water supply and leak issues",
            "icon": "💧",
            "department": "Water Authority",
            "active": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "streetlight",
            "description": "Street lighting malfunctions",
            "icon": "💡",
            "department": "Electricity",
            "active": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "missed_trash",
            "description": "Missed garbage collection",
            "icon": "🗑️",
            "department": "Sanitation",
            "active": True,
            "created_at": datetime.utcnow()
        }
    ]
    db["categories"].insert_many(categories)
    print(f"✅ Created {len(categories)} categories")
    
    # Seed Service Requests
    print("\n📋 Seeding service requests...")
    
    # Request 1: Triaged pothole (P1, at-risk SLA)
    req1_id = ObjectId()
    created_time = datetime.utcnow() - timedelta(hours=6)
    triaged_time = created_time + timedelta(minutes=12)
    
    request1 = {
        "_id": req1_id,
        "request_id": "CST-2026-0001",
        "citizen_ref": {
            "citizen_id": ObjectId(),
            "anonymous": False,
            "contact_channel": "email"
        },
        "category": "pothole",
        "sub_category": "asphalt_damage",
        "description": "Large pothole near the school entrance causing traffic hazard.",
        "title": "Pothole Near School Entrance",
        "tags": ["traffic_risk", "near_school"],
        "status": "triaged",
        "priority": "P1",
        "workflow": {
            "current_state": "triaged",
            "allowed_next": ["assigned", "closed"],
            "transition_rules_version": "v1.2"
        },
        "sla_policy": {
            "policy_id": "SLA-ROAD-P1",
            "target_hours": 48,
            "breach_threshold_hours": 60,
            "escalation_steps": [
                {"after_hours": 48, "action": "notify_dispatcher"},
                {"after_hours": 60, "action": "notify_manager"}
            ]
        },
        "timestamps": {
            "created_at": created_time,
            "triaged_at": triaged_time,
            "assigned_at": None,
            "resolved_at": None,
            "closed_at": None,
            "updated_at": triaged_time
        },
        "location": {
            "type": "Point",
            "coordinates": [35.2050, 31.9038],
            "address_hint": "Main Rd, Downtown",
            "zone_id": "ZONE-DT-01"
        },
        "address": "Main Road near City School, Downtown",
        "duplicates": {
            "is_master": True,
            "master_request_id": None,
            "linked_duplicates": []
        },
        "assignment": {
            "assigned_agent_id": None,
            "auto_assign_candidate_agents": [],
            "assignment_policy": "zone+skill+workload"
        },
        "evidence": [
            {
                "type": "photo",
                "url": "/uploads/cst-2026-0001-1.jpg",
                "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "uploaded_by": "citizen",
                "uploaded_at": created_time
            }
        ],
        "internal_notes": [
            "[triaged] Triaged as P1 due to proximity to school - high traffic area"
        ]
    }
    
    # Request 2: Assigned water leak (P1, in-progress)
    req2_id = ObjectId()
    created_time2 = datetime.utcnow() - timedelta(hours=24)
    triaged_time2 = created_time2 + timedelta(minutes=15)
    assigned_time2 = triaged_time2 + timedelta(hours=1)
    
    request2 = {
        "_id": req2_id,
        "request_id": "CST-2026-0002",
        "citizen_ref": {
            "citizen_id": ObjectId(),
            "anonymous": False,
            "contact_channel": "phone"
        },
        "category": "water_leak",
        "sub_category": "main_pipe",
        "description": "Major water leak flooding the street intersection.",
        "title": "Water Main Break at Intersection",
        "tags": ["flooding", "infrastructure_damage"],
        "status": "in_progress",
        "priority": "P1",
        "workflow": {
            "current_state": "in_progress",
            "allowed_next": ["resolved", "assigned"],
            "transition_rules_version": "v1.2"
        },
        "sla_policy": {
            "policy_id": "SLA-WATER-P1",
            "target_hours": 24,
            "breach_threshold_hours": 36,
            "escalation_steps": [
                {"after_hours": 18, "action": "notify_dispatcher"},
                {"after_hours": 36, "action": "notify_manager"}
            ]
        },
        "timestamps": {
            "created_at": created_time2,
            "triaged_at": triaged_time2,
            "assigned_at": assigned_time2,
            "resolved_at": None,
            "closed_at": None,
            "updated_at": datetime.utcnow() - timedelta(hours=1)
        },
        "location": {
            "type": "Point",
            "coordinates": [35.2100, 31.9050],
            "address_hint": "5th Ave & Oak St",
            "zone_id": "ZONE-W-02"
        },
        "address": "5th Avenue and Oak Street Intersection, West District",
        "duplicates": {
            "is_master": True,
            "master_request_id": None,
            "linked_duplicates": []
        },
        "assignment": {
            "assigned_agent_id": ObjectId(),
            "auto_assign_candidate_agents": [],
            "assignment_policy": "zone+skill+workload"
        },
        "evidence": [
            {
                "type": "photo",
                "url": "/uploads/cst-2026-0002-1.jpg",
                "sha256": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
                "uploaded_by": "citizen",
                "uploaded_at": created_time2
            }
        ],
        "internal_notes": [
            "[triaged] Escalated to P1 - infrastructure damage",
            "[assigned] Assigned to Water Authority Team",
            "[in_progress] Crew arrived on site, isolating water main"
        ]
    }
    
    # Request 3: Resolved streetlight (P2, closed)
    req3_id = ObjectId()
    created_time3 = datetime.utcnow() - timedelta(days=2)
    triaged_time3 = created_time3 + timedelta(hours=1)
    assigned_time3 = triaged_time3 + timedelta(hours=1)
    resolved_time3 = datetime.utcnow() - timedelta(hours=12)
    
    request3 = {
        "_id": req3_id,
        "request_id": "CST-2026-0003",
        "citizen_ref": {
            "citizen_id": ObjectId(),
            "anonymous": True,
            "contact_channel": None
        },
        "category": "streetlight",
        "sub_category": "outage",
        "description": "Street light not working on residential street.",
        "title": "Street Light Outage - Residential",
        "tags": ["safety", "night_visibility"],
        "status": "resolved",
        "priority": "P2",
        "workflow": {
            "current_state": "resolved",
            "allowed_next": ["closed"],
            "transition_rules_version": "v1.2"
        },
        "sla_policy": {
            "policy_id": "SLA-LIGHT-P2",
            "target_hours": 120,
            "breach_threshold_hours": 144,
            "escalation_steps": [
                {"after_hours": 90, "action": "notify_dispatcher"},
                {"after_hours": 144, "action": "notify_manager"}
            ]
        },
        "timestamps": {
            "created_at": created_time3,
            "triaged_at": triaged_time3,
            "assigned_at": assigned_time3,
            "resolved_at": resolved_time3,
            "closed_at": None,
            "updated_at": resolved_time3
        },
        "location": {
            "type": "Point",
            "coordinates": [35.1950, 31.8980],
            "address_hint": "Elm St, Residential",
            "zone_id": "ZONE-N-03"
        },
        "address": "Elm Street between 2nd and 3rd, North Residential",
        "duplicates": {
            "is_master": True,
            "master_request_id": None,
            "linked_duplicates": []
        },
        "assignment": {
            "assigned_agent_id": ObjectId(),
            "auto_assign_candidate_agents": [],
            "assignment_policy": "zone+skill+workload"
        },
        "evidence": [
            {
                "type": "photo",
                "url": "/uploads/cst-2026-0003-completion.jpg",
                "sha256": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "uploaded_by": "agent",
                "uploaded_at": resolved_time3
            }
        ],
        "internal_notes": [
            "[triaged] Categorized as P2 - residential area",
            "[assigned] Assigned to Electrical Maintenance Team",
            "[resolved] Replaced bulb and tested - working properly"
        ]
    }
    
    db["service_requests"].insert_many([request1, request2, request3])
    print(f"✅ Created 3 service requests")
    
    # Seed Performance Logs
    print("\n📊 Seeding performance logs...")
    
    # Performance log for request 1
    perf_log1 = {
        "_id": ObjectId(),
        "request_id": req1_id,
        "event_stream": [
            {
                "type": "created",
                "by": {"actor_type": "citizen", "actor_id": str(request1["citizen_ref"]["citizen_id"])},
                "at": created_time,
                "meta": {"channel": "web", "category": "pothole"}
            },
            {
                "type": "triaged",
                "by": {"actor_type": "dispatcher", "actor_id": "staff_12"},
                "at": triaged_time,
                "meta": {"priority": "P1", "zone_id": "ZONE-DT-01"}
            }
        ],
        "computed_kpis": {
            "resolution_minutes": None,
            "sla_target_hours": 48,
            "sla_state": "at_risk",
            "escalation_count": 0
        },
        "citizen_feedback": None,
        "created_at": created_time
    }
    
    # Performance log for request 2
    perf_log2 = {
        "_id": ObjectId(),
        "request_id": req2_id,
        "event_stream": [
            {
                "type": "created",
                "by": {"actor_type": "citizen", "actor_id": str(request2["citizen_ref"]["citizen_id"])},
                "at": created_time2,
                "meta": {"channel": "phone", "category": "water_leak"}
            },
            {
                "type": "triaged",
                "by": {"actor_type": "dispatcher", "actor_id": "staff_15"},
                "at": triaged_time2,
                "meta": {"priority": "P1", "zone_id": "ZONE-W-02"}
            },
            {
                "type": "assigned",
                "by": {"actor_type": "dispatcher", "actor_id": "staff_15"},
                "at": assigned_time2,
                "meta": {"agent_id": str(request2["assignment"]["assigned_agent_id"])}
            },
            {
                "type": "in_progress",
                "by": {"actor_type": "agent", "actor_id": str(request2["assignment"]["assigned_agent_id"])},
                "at": datetime.utcnow() - timedelta(hours=1),
                "meta": {"notes": "Crew on site"}
            }
        ],
        "computed_kpis": {
            "resolution_minutes": None,
            "sla_target_hours": 24,
            "sla_state": "on_track",
            "escalation_count": 0
        },
        "citizen_feedback": None,
        "created_at": created_time2
    }
    
    # Performance log for request 3
    perf_log3 = {
        "_id": ObjectId(),
        "request_id": req3_id,
        "event_stream": [
            {
                "type": "created",
                "by": {"actor_type": "citizen", "actor_id": "anonymous"},
                "at": created_time3,
                "meta": {"channel": "web", "category": "streetlight"}
            },
            {
                "type": "triaged",
                "by": {"actor_type": "dispatcher", "actor_id": "staff_10"},
                "at": triaged_time3,
                "meta": {"priority": "P2", "zone_id": "ZONE-N-03"}
            },
            {
                "type": "assigned",
                "by": {"actor_type": "dispatcher", "actor_id": "staff_10"},
                "at": assigned_time3,
                "meta": {"agent_id": str(request3["assignment"]["assigned_agent_id"])}
            },
            {
                "type": "resolved",
                "by": {"actor_type": "agent", "actor_id": str(request3["assignment"]["assigned_agent_id"])},
                "at": resolved_time3,
                "meta": {"completion_note": "Bulb replaced"}
            }
        ],
        "computed_kpis": {
            "resolution_minutes": int((resolved_time3 - created_time3).total_seconds() / 60),
            "sla_target_hours": 120,
            "sla_state": "on_track",
            "escalation_count": 0
        },
        "citizen_feedback": None,
        "created_at": created_time3
    }
    
    db["performance_logs"].insert_many([perf_log1, perf_log2, perf_log3])
    print(f"✅ Created 3 performance logs")
    
    print("\n" + "=" * 50)
    print("✅ Complete database seeding finished!")
    print("=" * 50)
    print("\n📊 Summary:")
    print(f"   Categories: {db['categories'].count_documents({})}")
    print(f"   Service Requests: {db['service_requests'].count_documents({})}")
    print(f"   Performance Logs: {db['performance_logs'].count_documents({})}")
    print("\n💡 Requests created:")
    print("   • CST-2026-0001: Pothole (triaged, P1, at-risk SLA)")
    print("   • CST-2026-0002: Water Leak (in_progress, P1)")
    print("   • CST-2026-0003: Streetlight (resolved, P2)")
    print()

if __name__ == "__main__":
    seed_all()
