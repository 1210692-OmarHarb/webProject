from fastapi import APIRouter, HTTPException
from app.database import categories_collection
from app.models import Category
from bson import ObjectId
from typing import List

router = APIRouter()


@router.get("/", response_model=List[Category])
async def get_all_categories(active_only: bool = True):
    """Get all categories"""
    try:
        query = {"active": True} if active_only else {}
        categories = list(categories_collection.find(query))
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{category_id}", response_model=Category)
async def get_category(category_id: str):
    """Get specific category"""
    try:
        category = categories_collection.find_one({"_id": ObjectId(category_id)})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        return category
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/", response_model=Category)
async def create_category(category: Category):
    """Create new category"""
    try:
        category_dict = category.dict(exclude={"id"}, exclude_none=True)
        result = categories_collection.insert_one(category_dict)
        created_category = categories_collection.find_one({"_id": result.inserted_id})
        return created_category
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{category_id}")
async def update_category(category_id: str, category: Category):
    """Update category"""
    try:
        update_data = category.dict(exclude={"id"}, exclude_none=True)
        result = categories_collection.update_one(
            {"_id": ObjectId(category_id)},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        updated_category = categories_collection.find_one({"_id": ObjectId(category_id)})
        return updated_category
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{category_id}")
async def delete_category(category_id: str):
    """Delete category"""
    try:
        result = categories_collection.delete_one({"_id": ObjectId(category_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"message": "Category deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
