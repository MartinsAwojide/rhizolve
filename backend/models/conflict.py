import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db import Base


class ConflictStatus(str, enum.Enum):
    FLAGGED = "flagged"
    RESOLVED = "resolved"


class ConflictResolution(str, enum.Enum):
    ACCEPT = "accept"
    RESET = "reset"


class Conflict(Base):
    __tablename__ = "conflicts"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    investigation_id: Mapped[str] = mapped_column(String)
    branch_path: Mapped[str] = mapped_column(String)
    existing_result: Mapped[str] = mapped_column(String)
    incoming_result: Mapped[str] = mapped_column(String)
    incoming_notes: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[ConflictStatus] = mapped_column(
        Enum(ConflictStatus, name="conflict_status"), default=ConflictStatus.FLAGGED
    )
    resolution: Mapped[ConflictResolution | None] = mapped_column(
        Enum(ConflictResolution, name="conflict_resolution"), nullable=True
    )
    resolved_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
