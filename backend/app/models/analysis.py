import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.session import Session


class Analysis(Base):
    """
    SQLAlchemy model representing an AI-generated analysis of a voice session.
    Fields defined in Phase 11:
      - id: UUID primary key
      - session_id: Foreign key to sessions.id (one-to-one)
      - summary: Comprehensive text summary of the session
      - strengths: List of strengths identified
      - weaknesses: List of areas for improvement
      - suggestions: List of actionable tips
      - created_at: Creation timestamp
    """
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    strengths: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )
    weaknesses: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )
    suggestions: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="analysis")
