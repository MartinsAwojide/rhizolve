from clerk_backend_api.security import (
    AuthenticateRequestOptions,
    authenticate_request_async,
)
from fastapi import Depends, HTTPException, Request
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import CLERK_AUTHORIZED_PARTIES, CLERK_SECRET_KEY
from core.db import get_db_session
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


async def _upsert_user(
    session: AsyncSession, clerk_user_id: str, email: str | None
) -> User:
    stmt = (
        pg_insert(User)
        .values(clerk_user_id=clerk_user_id, email=email)
        .on_conflict_do_update(
            index_elements=[User.clerk_user_id],
            set_={"email": email},
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
    return await _upsert_user(session, clerk_user_id, payload.get("email"))
