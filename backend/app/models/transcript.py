import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.session import Session


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # Possible speakers: 'user', 'assistant'
    speaker: Mapped[str] = mapped_column(
        String(50),
        default="user",
        nullable=False
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    is_final: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    timestamp: Mapped[float] = mapped_column(
        Float,
        default=lambda: datetime.utcnow().timestamp(),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="transcripts")
