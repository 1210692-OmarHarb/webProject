from fastapi import APIRouter, HTTPException
from app.database import citizens_collection, requests_collection
from app.models import CitizenProfile
from bson import ObjectId
from typing import List, Optional
from datetime import datetime, timedelta
import secrets

router = APIRouter()

def convert_objectids(obj):
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
    try:
        query = {}
        if verification_state:
            query["verification_state"] = verification_state
        if city:
            query["city"] = city
        
        citizens = list(citizens_collection.find(query).limit(limit))
        for citizen in citizens:
            citizen["_id"] = str(citizen["_id"])
        return citizens
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{citizen_id}", response_model=CitizenProfile)
async def get_citizen(citizen_id: str):
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
    try:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{citizen_id}", response_model=CitizenProfile)
async def update_citizen(citizen_id: str, updates: dict):
    try:
        updates.pop("_id", None)
        updates.pop("id", None)
        updates.pop("created_at", None)
        
        result = citizens_collection.update_one(
            {"_id": ObjectId(citizen_id)},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        updated_citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        updated_citizen["_id"] = str(updated_citizen["_id"])
        return updated_citizen
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{citizen_id}")
async def delete_citizen(citizen_id: str):
    try:
        result = citizens_collection.delete_one({"_id": ObjectId(citizen_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Citizen not found")
        return {"message": "Citizen deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{citizen_id}/requests")
async def get_citizen_requests(citizen_id: str):
    try:
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        requests_list = list(requests_collection.find({
            "citizen_ref.citizen_id": citizen_id
        }).sort("timestamps.created_at", -1))
        
        requests_list = [convert_objectids(req) for req in requests_list]
        
        return {
            "citizen_id": citizen_id,
            "citizen_name": citizen.get("full_name"),
            "total_requests": len(requests_list),
            "requests": requests_list
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{citizen_id}/statistics")
async def get_citizen_statistics(citizen_id: str):
    try:
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")
        
        requests_list = list(requests_collection.find({
            "citizen_ref.citizen_id": citizen_id
        }))
        
        status_counts = {}
        for req in requests_list:
            status = req.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "citizen_id": citizen_id,
            "citizen_name": citizen.get("full_name"),
            "total_requests": len(requests_list),
            "status_breakdown": status_counts,
            "verification_state": citizen.get("verification_state"),
            "avg_rating": citizen.get("avg_rating", 0.0)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{citizen_id}/request-verification")
async def request_verification(citizen_id: str):
    try:
        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")

        otp_code = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        citizens_collection.update_one(
            {"_id": ObjectId(citizen_id)},
            {
                "$set": {
                    "verification_token": otp_code,
                    "verification_token_expires": expires_at,
                    "verification_state": "pending",
                }
            },
        )

        return {
            "message": "Verification code generated",
            "otp_stub": otp_code,
            "expires_at": expires_at,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{citizen_id}/verify")
async def verify_citizen(citizen_id: str, payload: dict):
    try:
        otp = payload.get("otp") if isinstance(payload, dict) else None
        if not otp:
            raise HTTPException(status_code=400, detail="OTP is required")

        citizen = citizens_collection.find_one({"_id": ObjectId(citizen_id)})
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen not found")

        stored_token = citizen.get("verification_token")
        expires_at = citizen.get("verification_token_expires")

        if not stored_token:
            raise HTTPException(status_code=400, detail="No pending verification code")
        if stored_token != otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        if expires_at and datetime.utcnow() > expires_at:
            raise HTTPException(status_code=400, detail="OTP expired")

        citizens_collection.update_one(
            {"_id": ObjectId(citizen_id)},
            {
                "$set": {
                    "verification_state": "verified",
                    "verification_token": None,
                    "verification_token_expires": None,
                }
            },
        )

        return {"message": "Citizen verified"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
