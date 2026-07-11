import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db import Base


class ResetType(str, enum.Enum):
    SOFT = "soft"
    HARD = "hard"


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    investigation_id: Mapped[str] = mapped_column(String)
    driver_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    reset_type: Mapped[ResetType] = mapped_column(Enum(ResetType, name="reset_type"))
    branch_path: Mapped[str] = mapped_column(String)
    evidence_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
