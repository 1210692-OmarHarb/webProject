from fastapi import APIRouter, HTTPException
from app.database import citizens_collection, requests_collection
from app.models import CitizenProfile
from bson import ObjectId
from typing import List, Optional
from datetime import datetime, timedelta
import random
import string

router = APIRouter()


def convert_objectids(obj):
    """Recursively convert all ObjectIds to strings in a document"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: convert_objectids(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids(item) for item in obj]
    else:
        return obj


@router.get("/", response_model=List[CitizenProfile])
async def get_all_citizens(
    verification_state: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 50
):
    """Get all citizens with optional filters"""
    try:
        query = {}
        if verification_state:
            query["verification_state"] = verification_state
        if city:
            query["city"] = city
        
        citizens = list(citizens_collection.find(query).limit(limit))
        # Convert ObjectId to string for Pydantic V2
        for citizen in citizens:
            if "_id" in citizen:
                citizen["_id"] = str(citizen["_id"])
        return citizens
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{citizen_id}", response_model=CitizenProfile)
async def get_citizen(citizen_id: str):
    """Get specific citizen profile"""
    try:
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")
        citizen["_id"] = str(citizen["_id"])
        return citizen
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/", response_model=CitizenProfile)
async def create_citizen(citizen: CitizenProfile):
    """Create new citizen profile"""
    try:
        # Check if email already exists
        if citizen.email:
            existing = citizens_collection.find_one({"email": citizen.email})
            if existing:
                raise HTTPException(status_code=400, detail="Email already exists")
        
        citizen_dict = citizen.dict(exclude={"id"}, exclude_none=True)
        citizen_dict["created_at"] = datetime.utcnow()
        citizen_dict["total_requests"] = 0
        citizen_dict["avg_rating"] = 0.0
        
        result = citizens_collection.insert_one(citizen_dict)
        created_citizen = citizens_collection.find_one({"_id": result.inserted_id})
        created_citizen["_id"] = str(created_citizen["_id"])
        return created_citizen
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{citizen_id}", response_model=CitizenProfile)
async def update_citizen(citizen_id: str, updates: dict):
    """Update citizen profile"""
    try:
        # Remove fields that shouldn't be updated
        updates.pop("_id", None)
        updates.pop("id", None)
        updates.pop("created_at", None)
        updates.pop("total_requests", None)
        
        result = citizens_collection.update_one(
            {"_id": ObjectId(citizen_id)},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        updated_citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        updated_citizen["_id"] = str(updated_citizen["_id"])
        return updated_citizen
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{citizen_id}")
async def delete_citizen(citizen_id: str):
    """Delete citizen profile"""
    try:
        result = citizens_collection.delete_one({"_id": ObjectId(citizen_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Citizen not found")
        return {"message": "Citizen deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{citizen_id}/requests")
async def get_citizen_requests(citizen_id: str):
    """Get all requests submitted by a citizen"""
    try:
        # Verify citizen exists
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        # Find all requests by this citizen
        requests = list(requests_collection.find({
            "citizen_ref.citizen_id": citizen_id
        }).sort("timestamps.created_at", -1))
        
        # Convert all ObjectIds to strings recursively
        requests = [convert_objectids(req) for req in requests]
        
        return {
            "citizen_id": citizen_id,
            "citizen_name": citizen.get("full_name"),
            "total_requests": len(requests),
            "requests": requests
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{citizen_id}/statistics")
async def get_citizen_statistics(citizen_id: str):
    """Get statistics for a specific citizen"""
    try:
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        # Aggregate request statistics
        requests = list(requests_collection.find({
            "citizen_ref.citizen_id": citizen_id
        }))
        
        status_counts = {}
        for req in requests:
            status = req.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "citizen_id": citizen_id,
            "citizen_name": citizen.get("full_name"),
            "total_requests": len(requests),
            "status_breakdown": status_counts,
            "verification_state": citizen.get("verification_state"),
            "avg_rating": citizen.get("avg_rating", 0.0)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{citizen_id}/verify")
async def verify_citizen(citizen_id: str, request_body: dict):
    """Verify citizen with OTP token"""
    try:
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        # Extract OTP from request body
        otp = request_body.get("otp", "").strip()
        if not otp:
            raise HTTPException(status_code=400, detail="OTP is required")
        
        # Check if already verified
        if citizen.get("verification_state") == "verified":
            return {
                "message": "Citizen already verified",
                "verification_state": "verified",
                "citizen_id": citizen_id
            }
        
        # Verify OTP
        stored_token = citizen.get("verification_token")
        token_expires = citizen.get("verification_token_expires")
        
        if not stored_token:
            raise HTTPException(status_code=400, detail="No verification token found. Please request a new OTP.")
        
        # Check expiration
        if token_expires and token_expires < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Verification token expired. Please request a new OTP.")
        
        # Validate OTP
        if otp != stored_token:
            raise HTTPException(status_code=400, detail="Invalid OTP code. Please check and try again.")
        
        # Update verification state
        citizens_collection.update_one(
            {"_id": ObjectId(citizen_id)},
            {
                "$set": {
                    "verification_state": "verified",
                    "verification_token": None,
                    "verification_token_expires": None,
                    "verified_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "message": "Citizen verified successfully! You can now submit verified reports.",
            "verification_state": "verified",
            "citizen_id": citizen_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{citizen_id}/request-verification")
async def request_verification(citizen_id: str):
    """Request verification OTP for citizen (stub - generates 6-digit code)"""
    try:
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        # Generate 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Update citizen with OTP
        citizens_collection.update_one(
            {"_id": ObjectId(citizen_id)},
            {
                "$set": {
                    "verification_state": "pending",
                    "verification_token": otp,
                    "verification_token_expires": expires_at
                }
            }
        )
        
        # In production, send OTP via email/SMS
        # For stub, return it in response (NOT secure in production!)
        return {
            "message": "Verification OTP sent",
            "otp_stub": otp,  # Remove this in production!
            "expires_at": expires_at.isoformat(),
            "note": "In production, OTP would be sent via email/SMS"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
