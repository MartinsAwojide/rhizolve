from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user, list_clerk_org_members
from core.db import get_db_session
from models.organisation import Organisation
from models.user import User

router = APIRouter()


@router.get("/members")
async def get_org_members(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    if user.org_id is None:
        raise HTTPException(status_code=404, detail="No active organisation")
    org = await session.get(Organisation, user.org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="No active organisation")
    return await list_clerk_org_members(org.clerk_org_id)
