from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class TranscriptCreate(BaseModel):
    session_id: str
    content: str
    speaker: str = "user"
    is_final: bool = True
    timestamp: Optional[float] = None


class TranscriptResponse(BaseModel):
    id: str
    session_id: str
    speaker: str
    content: str
    is_final: bool
    timestamp: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
