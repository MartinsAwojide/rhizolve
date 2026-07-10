from clerk_backend_api import Clerk
from clerk_backend_api.security import (
    AuthenticateRequestOptions,
    authenticate_request_async,
)
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import CLERK_AUTHORIZED_PARTIES, CLERK_SECRET_KEY
from core.db import get_db_session
from models.organisation import Organisation
from models.user import User


async def verify_clerk_token(request: Request) -> dict | None:
    request_state = await authenticate_request_async(
        request,
        AuthenticateRequestOptions(
            secret_key=CLERK_SECRET_KEY,
            authorized_parties=CLERK_AUTHORIZED_PARTIES,
        ),
    )
    return request_state.payload if request_state.is_signed_in else None


async def _upsert_org(
    session: AsyncSession, clerk_org_id: str, name: str | None
) -> Organisation:
    stmt = (
        pg_insert(Organisation)
        .values(clerk_org_id=clerk_org_id, name=name)
        .on_conflict_do_nothing(index_elements=[Organisation.clerk_org_id])
    )
    await session.execute(stmt)
    result = await session.execute(
        select(Organisation).where(Organisation.clerk_org_id == clerk_org_id)
    )
    return result.scalar_one()


async def _upsert_user(
    session: AsyncSession,
    clerk_user_id: str,
    email: str | None,
    org_id: int | None,
) -> User:
    stmt = (
        pg_insert(User)
        .values(clerk_user_id=clerk_user_id, email=email, org_id=org_id)
        .on_conflict_do_update(
            index_elements=[User.clerk_user_id],
            set_={"email": email, "org_id": org_id},
        )
        .returning(User)
    )
    result = await session.execute(stmt)
    await session.commit()
    return result.scalar_one()


async def get_current_user(
    request: Request, session: AsyncSession = Depends(get_db_session)
) -> User:
    payload = await verify_clerk_token(request)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or missing session")
    clerk_user_id = payload.get("sub")
    if clerk_user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or missing session")

    org_id = None
    clerk_org_id = payload.get("org_id")
    if clerk_org_id:
        org = await _upsert_org(session, clerk_org_id, payload.get("org_slug"))
        org_id = org.id

    return await _upsert_user(session, clerk_user_id, payload.get("email"), org_id)


async def list_clerk_org_members(clerk_org_id: str) -> list[dict]:
    """Assumes Clerk's `identifier` field is the member's email — not
    verified against a real Clerk response, only against the SDK's current
    type definitions (see ADR-009 / US-16 notes)."""
    clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)
    memberships = await clerk.organization_memberships.list_async(
        organization_id=clerk_org_id
    )
    return [
        {
            "clerk_user_id": m.public_user_data.user_id if m.public_user_data else None,
            "email": m.public_user_data.identifier if m.public_user_data else None,
            "first_name": m.public_user_data.first_name if m.public_user_data else None,
            "last_name": m.public_user_data.last_name if m.public_user_data else None,
            "role": m.role,
        }
        for m in (memberships.data or [])
    ]
