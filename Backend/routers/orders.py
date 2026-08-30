from fastapi import APIRouter

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("/")
def list_orders():
    return {"message": "List of orders will be here"}