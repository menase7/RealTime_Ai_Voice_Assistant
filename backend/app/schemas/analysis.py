from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class AnalysisCreate(BaseModel):
    summary: str = Field(..., description="Comprehensive summary of the voice session")
    strengths: List[str] = Field(default_factory=list, description="Key communication and topical strengths")
    weaknesses: List[str] = Field(default_factory=list, description="Areas for communication improvement")
    suggestions: List[str] = Field(default_factory=list, description="Actionable recommendations")


class AnalysisResponse(BaseModel):
    id: str
    session_id: str
    summary: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
