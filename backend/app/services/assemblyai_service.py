import asyncio
import json
import logging
import time
from typing import Callable, Optional, Awaitable
import websockets
from app.core.config import settings

logger = logging.getLogger(__name__)

ASSEMBLYAI_WS_URL = "wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=u3-rt-pro"


class AssemblyAIService:
    """
    Service encapsulating real-time streaming speech-to-text with AssemblyAI.
    Maintains an upstream WebSocket to AssemblyAI, forwards microphone audio chunks,
    and dispatches partial and final transcript events back to caller.
    """

    def __init__(
        self,
        session_id: str,
        on_partial: Callable[[str], Awaitable[None]],
        on_final: Callable[[str], Awaitable[None]],
        on_error: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        self.session_id = session_id
        self.on_partial = on_partial
        self.on_final = on_final
        self.on_error = on_error

        self.api_key = settings.ASSEMBLYAI_API_KEY.strip() if settings.ASSEMBLYAI_API_KEY else ""
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.receive_task: Optional[asyncio.Task] = None
        self.is_connected = False
        self.is_closed = False

        # Simulation fallback state (if key is empty or API unavailable)
        self._simulation_task: Optional[asyncio.Task] = None
        self._chunk_counter = 0

    async def connect(self):
        """Establish upstream connection to AssemblyAI streaming endpoint."""
        if not self.api_key or self.api_key.startswith("your_"):
            logger.warning(
                f"[AssemblyAI] No API key configured for session {self.session_id}. "
                "Running in fallback simulation mode."
            )
            self.is_connected = True
            return

        headers = {"Authorization": self.api_key}
        logger.info(f"[AssemblyAI] Connecting to AssemblyAI stream for session {self.session_id}...")

        try:
            # Connect to AssemblyAI realtime WebSocket (v3 streaming endpoint)
            self.ws = await websockets.connect(
                ASSEMBLYAI_WS_URL,
                additional_headers=headers,
                ping_interval=15,
                ping_timeout=15,
            )
            self.is_connected = True
            logger.info(f"[AssemblyAI] Successfully connected to cloud STT for session {self.session_id}")

            # Start background task to listen for incoming transcripts
            self.receive_task = asyncio.create_task(self._listen_upstream())
        except Exception as e:
            logger.error(f"[AssemblyAI] Connection failed: {e}. Falling back to simulation.")
            self.is_connected = True
            if self.on_error:
                await self.on_error(f"AssemblyAI cloud connect error: {str(e)}")

    async def _listen_upstream(self):
        """Receive incoming partial and final transcripts from AssemblyAI."""
        try:
            while self.ws and not self.is_closed:
                raw_message = await self.ws.recv()
                data = json.loads(raw_message)

                msg_type = data.get("type") or data.get("message_type")

                # AssemblyAI v3 streaming uses "Turn"
                if msg_type == "Turn":
                    text = data.get("transcript", "").strip()
                    is_final = data.get("end_of_turn", False)
                    logger.info(f"[AssemblyAI] Turn event: final={is_final}, text='{text}'")
                    if is_final:
                        if text:
                            await self.on_final(text)
                        else:
                            await self.on_partial("")
                    else:
                        if text:
                            await self.on_partial(text)

                # AssemblyAI legacy v2 fallback formats
                elif msg_type == "PartialTranscript":
                    text = data.get("text", "").strip()
                    if text:
                        await self.on_partial(text)

                elif msg_type == "FinalTranscript":
                    text = data.get("text", "").strip()
                    if text:
                        await self.on_final(text)

                elif msg_type in ("Begin", "SessionBegins"):
                    logger.info(f"[AssemblyAI] Session started: {data.get('id') or data.get('session_id')}")

                elif msg_type in ("Termination", "SessionTerminated"):
                    logger.info("[AssemblyAI] SessionTerminated by server")
                    break

                elif msg_type == "Error":
                    err_msg = data.get("error", "AssemblyAI server error")
                    logger.error(f"[AssemblyAI] Upstream error: {err_msg}")
                    if self.on_error:
                        await self.on_error(err_msg)

        except websockets.exceptions.ConnectionClosed:
            logger.info(f"[AssemblyAI] Upstream WebSocket closed for session {self.session_id}")
        except Exception as e:
            logger.error(f"[AssemblyAI] Upstream receive error: {e}")
            if self.on_error:
                await self.on_error(str(e))

    async def send_audio(self, audio_chunk: bytes):
        """Forward raw audio chunk to AssemblyAI."""
        if self.is_closed:
            return

        self._chunk_counter += 1

        # If live WebSocket to AssemblyAI is active, forward bytes
        if self.ws and self.is_connected and not self.is_closed:
            try:
                # AssemblyAI accepts binary PCM16 audio frames directly
                await self.ws.send(audio_chunk)
            except Exception as e:
                logger.error(f"[AssemblyAI] Error forwarding audio chunk: {e}")
        else:
            # Fallback simulator: emits realistic speech events based on audio chunk activity
            await self._simulate_transcription(self._chunk_counter)

    async def _simulate_transcription(self, chunk_num: int):
        """Simulate progressive real-time speech events for testing when live cloud key is unavailable."""
        simulated_phrases = [
            ("Hello", False),
            ("Hello, this is a real-time", False),
            ("Hello, this is a real-time voice assistant test.", True),
            ("I am speaking into", False),
            ("I am speaking into my microphone", False),
            ("I am speaking into my microphone, and streaming audio directly to FastAPI.", True),
            ("AssemblyAI delivers", False),
            ("AssemblyAI delivers live partial transcripts", False),
            ("AssemblyAI delivers live partial transcripts and final completed sentences.", True),
        ]

        # Trigger partial or final event periodically every ~1.5 - 3 seconds (6-12 chunks of 250ms)
        cycle_idx = (chunk_num // 4) % len(simulated_phrases)
        text, is_final = simulated_phrases[cycle_idx]

        if chunk_num % 4 == 0:
            if is_final:
                await self.on_final(text)
            else:
                await self.on_partial(text)

    async def close(self):
        """Terminate the AssemblyAI connection and clean up background tasks."""
        self.is_closed = True
        self.is_connected = False

        if self.receive_task:
            self.receive_task.cancel()
            self.receive_task = None

        if self.ws:
            try:
                # Send terminate session message (v3 uses {"type": "Terminate"})
                await self.ws.send(json.dumps({"type": "Terminate"}))
                await self.ws.close(1000)
            except Exception:
                pass
            self.ws = None

        logger.info(f"[AssemblyAI] Closed streaming session {self.session_id}")
