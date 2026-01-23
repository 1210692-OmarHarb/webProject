from fastapi import APIRouter, HTTPException
from app.database import users_collection
from app.models import User
from bson import ObjectId
from typing import List

router = APIRouter()

@router.get("/", response_model=List[User])
async def get_all_users(role: str = None):
    try:
        query = {"role": role} if role else {}
        users = list(users_collection.find(query))
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/", response_model=User)
async def create_user(user: User):
    try:
        existing = users_collection.find_one({"email": user.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        user_dict = user.dict(exclude={"id"}, exclude_none=True)
        result = users_collection.insert_one(user_dict)
        created_user = users_collection.find_one({"_id": result.inserted_id})
        return created_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{user_id}")
async def update_user(user_id: str, user: User):
    try:
        update_data = user.dict(exclude={"id"}, exclude_none=True)
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)})
        return updated_user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{user_id}")
async def delete_user(user_id: str):
    try:
        result = users_collection.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
