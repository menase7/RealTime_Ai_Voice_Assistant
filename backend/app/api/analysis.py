import json
import logging
import time
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.core.security import decode_access_token
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analysis import AnalysisCreate, AnalysisResponse
from app.services.session_service import (
    get_session_by_id,
    get_session_transcripts,
    get_session_analysis,
    save_or_update_analysis,
    delete_session_analysis,
)
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Analysis"])


@router.get("/sessions/{session_id}/analysis", response_model=AnalysisResponse)
@router.get("/api/sessions/{session_id}/analysis", response_model=AnalysisResponse)
async def get_session_analysis_endpoint(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 11: Retrieve saved AI analysis for an owned voice session.
    Returns the stored summary, strengths, weaknesses, suggestions, and timestamp.
    """
    analysis = await get_session_analysis(db, session_id=session_id, user_id=current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI analysis found for this session."
        )
    return analysis


@router.post("/sessions/{session_id}/analysis", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
@router.post("/api/sessions/{session_id}/analysis", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_session_analysis_endpoint(
    session_id: str,
    analysis_in: AnalysisCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 11: Manually save or update an AI analysis for a voice session.
    """
    session = await get_session_by_id(db, session_id=session_id, user_id=current_user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied."
        )

    analysis = await save_or_update_analysis(
        db=db,
        session_id=session_id,
        summary=analysis_in.summary,
        strengths=analysis_in.strengths,
        weaknesses=analysis_in.weaknesses,
        suggestions=analysis_in.suggestions,
    )
    return analysis


@router.delete("/sessions/{session_id}/analysis", status_code=status.HTTP_200_OK)
@router.delete("/api/sessions/{session_id}/analysis", status_code=status.HTTP_200_OK)
async def delete_session_analysis_endpoint(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 11: Delete saved AI analysis for a voice session.
    """
    deleted = await delete_session_analysis(db, session_id=session_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI analysis found for this session or access denied."
        )
    return {"message": "AI analysis deleted successfully", "session_id": session_id}


@router.get("/sessions/{session_id}/analysis/stream")
@router.get("/api/sessions/{session_id}/analysis/stream")
async def stream_session_analysis(
    session_id: str,
    token: Optional[str] = Query(None),
):
    """
    Phase 10 & 11: Gemini Streaming Analysis via Server-Sent Events (SSE) with Auto-Persistence.
    Retrieves session transcripts, streams prompt to Gemini, progressively yields
    chunk and structured analysis events over HTTP via SSE, and automatically persists
    the completed analysis to the PostgreSQL database.
    """
    # 1. Validate JWT from query parameter (standard for browser EventSource API)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required via query parameter for SSE stream"
        )

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )
    user_id = payload["sub"]

    # 2. Verify Session Access in Database
    async with AsyncSessionLocal() as db:
        session = await get_session_by_id(db, session_id=session_id, user_id=user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or access denied"
            )
        transcripts = await get_session_transcripts(db, session_id=session_id, user_id=user_id) or []

    transcript_texts = [t.content.strip() for t in transcripts if t.content]

    async def event_generator():
        try:
            logger.info(f"[SSE] Client connected to Gemini analysis stream for session {session_id}")

            # 1. Handshake Event
            yield f"event: start\ndata: {json.dumps({'session_id': session_id, 'timestamp': time.time(), 'message': 'Gemini analysis stream established'})}\n\n"

            # 2. Forward stream from GeminiService (Phase 10 & 11: streaming & auto-save)
            async for sse_item in gemini_service.analyze_transcripts_stream(transcript_texts):
                ev_name = sse_item.get("event", "message")
                ev_data = sse_item.get("data", {})

                # When the stream completes, persist analysis into PostgreSQL (Phase 11)
                if ev_name == "complete":
                    try:
                        async with AsyncSessionLocal() as save_db:
                            saved_analysis = await save_or_update_analysis(
                                db=save_db,
                                session_id=session_id,
                                summary=ev_data.get("summary", ""),
                                strengths=ev_data.get("strengths", []),
                                weaknesses=ev_data.get("weaknesses", []),
                                suggestions=ev_data.get("suggestions", []),
                            )
                            ev_data["id"] = saved_analysis.id
                            ev_data["created_at"] = saved_analysis.created_at.isoformat()
                            logger.info(
                                f"[SSE] Persisted analysis to database for session {session_id} (id={saved_analysis.id})"
                            )
                    except Exception as save_err:
                        logger.error(f"[SSE] Failed to save analysis to database: {save_err}")

                yield f"event: {ev_name}\ndata: {json.dumps(ev_data)}\n\n"

            logger.info(f"[SSE] Gemini stream finished cleanly for session {session_id}")

        except Exception as e:
            logger.error(f"[SSE] Error in Gemini event stream: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
