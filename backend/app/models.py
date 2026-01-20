from pydantic import BaseModel, Field, GetJsonSchemaHandler
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic_core import core_schema

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.str_schema(),
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema, handler):
        return {"type": "string"}


# ==================== Basic Models ====================

class Location(BaseModel):
    type: str = "Point"
    coordinates: List[float]
    address_hint: Optional[str] = None
    zone_id: Optional[str] = None


class Category(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    department: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


# ==================== User Models ====================

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    username: str
    email: str
    password: str  # In production, should be hashed
    role: str  # "citizen", "staff", "agent", "admin"
    full_name: Optional[str] = None
    department: Optional[str] = None
    verification_state: Optional[str] = "unverified"
    active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


# ==================== Citizen Models ====================

class CitizenProfile(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    zone_id: Optional[str] = None
    verification_state: str = "unverified"  # verified, unverified
    avg_rating: Optional[float] = 0.0
    total_requests: int = 0
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


# ==================== Service Request Models ====================

class WorkflowState(BaseModel):
    current_state: str  # new, triaged, assigned, in_progress, resolved, closed
    allowed_next: List[str] = []
    transition_rules_version: str = "v1.0"


class SLAPolicy(BaseModel):
    policy_id: str
    target_hours: int
    breach_threshold_hours: int
    escalation_steps: Optional[List[Dict[str, Any]]] = []


class Evidence(BaseModel):
    type: str  # photo, video, document
    url: str
    sha256: Optional[str] = None
    uploaded_by: str = "citizen"
    uploaded_at: Optional[datetime] = None


class Timestamps(BaseModel):
    created_at: datetime
    triaged_at: Optional[datetime] = None
    assigned_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    updated_at: datetime


class Assignment(BaseModel):
    assigned_agent_id: Optional[PyObjectId] = None
    auto_assign_candidate_agents: List[PyObjectId] = []
    assignment_policy: str = "zone+skill+workload"


class Duplicates(BaseModel):
    is_master: bool = True
    master_request_id: Optional[PyObjectId] = None
    linked_duplicates: List[PyObjectId] = []


class ServiceRequest(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    request_id: Optional[str] = None
    citizen_ref: Optional[Dict[str, Any]] = None
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=500)
    category: str
    sub_category: Optional[str] = None
    tags: List[str] = []
    status: str = "new"  # new, triaged, assigned, in_progress, resolved, closed
    priority: str = "P2"  # P0, P1, P2, P3
    workflow: Optional[WorkflowState] = None
    sla_policy: Optional[SLAPolicy] = None
    location: Location
    address: Optional[str] = None
    timestamps: Optional[Timestamps] = None
    assignment: Optional[Assignment] = None
    evidence: List[Evidence] = []
    internal_notes: List[str] = []
    duplicates: Optional[Duplicates] = None

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


class ServiceRequestResponse(BaseModel):
    id: str = Field(alias="_id")
    request_id: Optional[str] = None
    title: str
    description: str
    category: str
    location: Location
    address: Optional[str] = None
    status: str
    priority: str
    timestamps: Optional[Timestamps] = None

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


# ==================== Performance Log Models ====================

class LogEvent(BaseModel):
    type: str  # created, triaged, assigned, sla_escalation, resolved, closed
    by: Optional[Dict[str, str]] = None
    at: datetime
    meta: Optional[Dict[str, Any]] = None


class ComputedKPIs(BaseModel):
    resolution_minutes: Optional[int] = None
    sla_target_hours: int = 48
    sla_state: str = "on_track"  # on_track, at_risk, breached
    escalation_count: int = 0


class PerformanceLog(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    request_id: PyObjectId
    event_stream: List[LogEvent] = []
    computed_kpis: Optional[ComputedKPIs] = None
    citizen_feedback: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True


# ==================== Geo Feed Models ====================

class GeoFeature(BaseModel):
    type: str = "Feature"
    properties: Dict[str, Any]
    geometry: Dict[str, Any]


class GeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoFeature]


class GeoFeed(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    feed_name: str
    generated_at: datetime
    filters: Optional[Dict[str, Any]] = None
    geojson: Optional[GeoJSON] = None
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
