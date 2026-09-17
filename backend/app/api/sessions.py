from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.schemas.transcript import TranscriptResponse
from app.services.session_service import (
    create_session,
    get_user_sessions,
    get_session_by_id,
    delete_session,
    update_session,
    get_session_transcripts
)

router = APIRouter(tags=["Sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_session(
    session_in: Optional[SessionCreate] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new voice session for the authenticated user."""
    session = await create_session(db, user_id=current_user.id, session_in=session_in)
    return SessionResponse.model_validate(session)


@router.get("", response_model=List[SessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all voice sessions for the authenticated user, newest first."""
    sessions = await get_user_sessions(db, user_id=current_user.id)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details of a specific voice session owned by the authenticated user."""
    session = await get_session_by_id(db, session_id=session_id, user_id=current_user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return SessionResponse.model_validate(session)


@router.patch("/{session_id}", response_model=SessionResponse)
async def patch_session(
    session_id: str,
    session_in: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update title or status of an owned voice session."""
    session = await update_session(
        db,
        session_id=session_id,
        user_id=current_user.id,
        session_in=session_in
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return SessionResponse.model_validate(session)


@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
async def remove_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific voice session owned by the authenticated user."""
    deleted = await delete_session(db, session_id=session_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return {"message": "Session deleted successfully", "id": session_id}


@router.get("/{session_id}/transcripts", response_model=List[TranscriptResponse])
async def list_session_transcripts(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all transcripts belonging to a specific voice session owned by the authenticated user."""
    transcripts = await get_session_transcripts(db, session_id=session_id, user_id=current_user.id)
    if transcripts is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return [TranscriptResponse.model_validate(t) for t in transcripts]
