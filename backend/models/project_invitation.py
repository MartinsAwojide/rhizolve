import enum
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db import Base
from models.project_member import Role

INVITATION_VALIDITY = timedelta(days=7)


class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


class ProjectInvitation(Base):
    __tablename__ = "project_invitations"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    email: Mapped[str] = mapped_column(String)
    role: Mapped[Role] = mapped_column(Enum(Role, name="project_member_role"))
    token: Mapped[str] = mapped_column(
        String, unique=True, index=True, default=lambda: secrets.token_urlsafe(32)
    )
    status: Mapped[InvitationStatus] = mapped_column(
        Enum(InvitationStatus, name="invitation_status"),
        default=InvitationStatus.PENDING,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc) + INVITATION_VALIDITY,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
