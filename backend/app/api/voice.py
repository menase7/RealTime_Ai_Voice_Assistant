import time
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.services.session_service import get_session_by_id, update_session
from app.schemas.session import SessionUpdate

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
    Supports both text control frames (JSON) and binary audio frames (raw bytes/blobs).
    Phase 6 connects MediaRecorder -> WebSocket -> FastAPI.
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

    # Session audio streaming state
    total_chunks_received = 0
    total_bytes_received = 0
    is_streaming_audio = False

    # Send Initial Handshake Ack
    await websocket.send_json({
        "type": "connection_ack",
        "session_id": session_id,
        "status": "connected",
        "phase": 6,
        "message": "WebSocket connection established and ready for audio streaming",
        "timestamp": time.time()
    })

    # 4. Event Processing Loop (supports both text JSON and binary audio frames)
    try:
        while True:
            message = await websocket.receive()

            # --- A. BINARY AUDIO FRAME (Microphone Audio Chunks) ---
            if "bytes" in message and message["bytes"] is not None:
                audio_bytes = message["bytes"]
                chunk_len = len(audio_bytes)
                total_chunks_received += 1
                total_bytes_received += chunk_len

                # Send real-time audio chunk ingestion acknowledgement
                await websocket.send_json({
                    "type": "audio_chunk_ack",
                    "chunk_index": total_chunks_received,
                    "chunk_size": chunk_len,
                    "total_chunks": total_chunks_received,
                    "total_bytes": total_bytes_received,
                    "timestamp": time.time()
                })

            # --- B. TEXT JSON CONTROL FRAMES ---
            elif "text" in message and message["text"] is not None:
                try:
                    data = json.loads(message["text"])
                except Exception:
                    data = {"type": "raw", "content": message["text"]}

                event_type = data.get("type")

                if event_type == "start_audio_stream":
                    is_streaming_audio = True
                    total_chunks_received = 0
                    total_bytes_received = 0

                    # Update session status to active in database
                    async with AsyncSessionLocal() as db:
                        await update_session(
                            db,
                            session_id=session_id,
                            user_id=user_id,
                            session_in=SessionUpdate(status="active")
                        )

                    logger.info(f"Started audio stream for session {session_id}")
                    await websocket.send_json({
                        "type": "audio_stream_started",
                        "session_id": session_id,
                        "status": "active",
                        "timestamp": time.time()
                    })

                elif event_type == "stop_audio_stream":
                    is_streaming_audio = False
                    logger.info(
                        f"Stopped audio stream for session {session_id}: "
                        f"{total_chunks_received} chunks, {total_bytes_received} bytes"
                    )
                    await websocket.send_json({
                        "type": "audio_stream_stopped",
                        "session_id": session_id,
                        "total_chunks": total_chunks_received,
                        "total_bytes": total_bytes_received,
                        "timestamp": time.time()
                    })

                elif event_type == "ping":
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
        logger.info(
            f"WebSocket connection cleaned up for session {session_id}. "
            f"Total ingested: {total_chunks_received} chunks ({total_bytes_received} bytes)"
        )
