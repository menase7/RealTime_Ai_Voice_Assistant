from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


class SessionCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=255, description="Optional title for the voice session")

    @field_validator("title", mode="before")
    @classmethod
    def sanitize_title(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v


class SessionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, pattern="^(created|active|completed)$")
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    @field_validator("title", mode="before")
    @classmethod
    def sanitize_title(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
