from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from core.auth import get_current_user
from models.user import User

router = APIRouter()


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clerk_user_id: str
    email: str | None
    display_name: str | None
    org_id: int | None


@router.post("/sync")
async def sync_user(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
