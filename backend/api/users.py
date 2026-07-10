from fastapi import APIRouter, Depends

from api.auth import UserOut
from core.auth import get_current_user
from models.user import User

router = APIRouter()


@router.get("/me")
async def read_current_user(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
