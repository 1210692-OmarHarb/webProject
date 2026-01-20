from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def test_requests():
    return {"message": "Requests router working"}