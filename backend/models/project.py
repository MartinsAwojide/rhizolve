import enum
import secrets
from datetime import datetime, timezone

from sqlalchemy import ARRAY, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db import Base


class Visibility(str, enum.Enum):
    PRIVATE = "private"
    TEAM = "team"
    ORG = "org"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: f"proj-{secrets.token_hex(4)}"
    )
    name: Mapped[str] = mapped_column(String)
    domain: Mapped[str | None] = mapped_column(String, nullable=True)
    visibility: Mapped[Visibility] = mapped_column(Enum(Visibility, name="visibility"))
    compliance_standards: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    maturity_level: Mapped[int] = mapped_column(Integer, default=2)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
