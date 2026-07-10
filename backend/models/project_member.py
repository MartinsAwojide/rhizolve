import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db import Base


class Role(str, enum.Enum):
    OWNER = "owner"
    ANALYST = "analyst"
    CONTRIBUTOR = "contributor"
    OPERATOR = "operator"
    MANAGER = "manager"
    VIEWER = "viewer"


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[Role] = mapped_column(Enum(Role, name="project_member_role"))
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
