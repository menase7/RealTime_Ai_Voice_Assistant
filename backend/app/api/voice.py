import time
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.services.session_service import get_session_by_id

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket Voice"])


@router.websocket("/sessions/{session_id}")
async def voice_websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time voice session streaming.
    Phase 4 implements authentication, connection handshake, ping-pong latency check,
    and test messaging before introducing audio streams in Phase 5 & 6.
    """
    # 1. Validate JWT Token
    if not token:
        logger.warning(f"WebSocket connection rejected: Missing token for session {session_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        logger.warning(f"WebSocket connection rejected: Invalid token for session {session_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
        return

    user_id = payload["sub"]

    # 2. Verify Session Ownership in Database
    async with AsyncSessionLocal() as db:
        session = await get_session_by_id(db, session_id=session_id, user_id=user_id)
        if not session:
            logger.warning(f"WebSocket connection rejected: Session {session_id} not found for user {user_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session not found or access denied")
            return

    # 3. Accept Connection
    await websocket.accept()
    logger.info(f"WebSocket connected for session {session_id} by user {user_id}")

    # Send Initial Handshake Ack
    await websocket.send_json({
        "type": "connection_ack",
        "session_id": session_id,
        "status": "connected",
        "phase": 4,
        "message": "WebSocket connection established successfully",
        "timestamp": time.time()
    })

    # 4. Event Processing Loop
    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "ping":
                client_ts = data.get("timestamp")
                await websocket.send_json({
                    "type": "pong",
                    "client_timestamp": client_ts,
                    "server_timestamp": time.time(),
                })

            elif event_type == "test_message":
                content = data.get("content", "")
                await websocket.send_json({
                    "type": "echo",
                    "content": content,
                    "server_timestamp": time.time(),
                    "message": f"Server received: {content}"
                })

            elif event_type == "close":
                logger.info(f"Client requested connection closure for session {session_id}")
                await websocket.send_json({
                    "type": "closing_ack",
                    "message": "Closing connection as requested",
                    "timestamp": time.time()
                })
                break

            else:
                # Echo unknown events for transparency during development
                await websocket.send_json({
                    "type": "unknown_event_ack",
                    "original_type": event_type,
                    "timestamp": time.time()
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id} (Client disconnected)")
    except Exception as e:
        logger.error(f"WebSocket error in session {session_id}: {e}")
    finally:
        logger.info(f"WebSocket connection cleaned up for session {session_id}")
