import json
import logging
import time
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.services.session_service import get_session_by_id, get_session_transcripts
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Analysis SSE"])


@router.get("/sessions/{session_id}/analysis/stream")
@router.get("/api/sessions/{session_id}/analysis/stream")
async def stream_session_analysis(
    session_id: str,
    token: Optional[str] = Query(None),
):
    """
    Phase 10: Gemini Streaming Analysis via Server-Sent Events (SSE).
    Retrieves session transcripts, streams prompt to Gemini, and progressively yields
    chunk and structured analysis events over HTTP via SSE.
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

            # 2. Forward stream from GeminiService (Phase 10: analysis.py -> gemini_service.py -> Gemini)
            async for sse_item in gemini_service.analyze_transcripts_stream(transcript_texts):
                ev_name = sse_item.get("event", "message")
                ev_data = sse_item.get("data", {})
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
