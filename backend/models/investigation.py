import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db import Base


class InvestigationStatus(str, enum.Enum):
    ACTIVE = "active"
    AWAITING_GEMBA = "awaiting_gemba"
    COMPLETE = "complete"


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    status: Mapped[InvestigationStatus] = mapped_column(
        Enum(InvestigationStatus, name="investigation_status")
    )
    interrupt_type: Mapped[str | None] = mapped_column(String, nullable=True)
    current_depth: Mapped[int] = mapped_column(Integer, default=0)
    root_cause_found: Mapped[bool] = mapped_column(Boolean, default=False)
    node_count: Mapped[int] = mapped_column(Integer, default=0)
    node_pending_count: Mapped[int] = mapped_column(Integer, default=0)
    awaiting_quorum: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
