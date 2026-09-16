import asyncio
import json
import time
import httpx
import websockets

BACKEND_HTTP = "http://localhost:8000"
BACKEND_WS = "ws://localhost:8000"

async def test_audio_streaming():
    # 1. Login to retrieve token
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{BACKEND_HTTP}/auth/login", json={
            "email": "testuser@example.com",
            "password": "securepass123"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        token = resp.json()["access_token"]
        print("[SUCCESS] Authenticated test user")

        # 2. Create a session for testing
        resp = await client.post(
            f"{BACKEND_HTTP}/sessions",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "Audio Streaming Test"}
        )
        assert resp.status_code == 201, f"Session creation failed: {resp.text}"
        session_id = resp.json()["id"]
        print(f"[SUCCESS] Created audio test session: {session_id}")

    # 3. Connect to WebSocket
    ws_url = f"{BACKEND_WS}/ws/sessions/{session_id}?token={token}"
    async with websockets.connect(ws_url) as ws:
        # Handshake ACK
        ack = json.loads(await ws.recv())
        assert ack["type"] == "connection_ack"
        print("[SUCCESS] Connection handshake verified")

        # 4. Start audio stream
        await ws.send(json.dumps({"type": "start_audio_stream"}))
        started_msg = json.loads(await ws.recv())
        assert started_msg["type"] == "audio_stream_started"
        print("[SUCCESS] Sent start_audio_stream -> Received audio_stream_started ACK")

        # 5. Stream 10 binary audio chunks (simulating 250ms microphone slices)
        chunk_size = 4096
        total_chunks = 10
        print(f"Streaming {total_chunks} binary audio frames ({chunk_size} bytes each)...")

        for i in range(1, total_chunks + 1):
            dummy_audio = bytes([i % 256] * chunk_size)
            # Send raw binary frame
            await ws.send(dummy_audio)

            # Receive server ingestion ACK
            chunk_ack = json.loads(await ws.recv())
            assert chunk_ack["type"] == "audio_chunk_ack"
            assert chunk_ack["chunk_index"] == i
            assert chunk_ack["chunk_size"] == chunk_size
            assert chunk_ack["total_chunks"] == i
            assert chunk_ack["total_bytes"] == i * chunk_size

        print(f"[SUCCESS] Streamed {total_chunks} binary frames! Server ingested {total_chunks * chunk_size} bytes.")

        # 6. Stop audio stream
        await ws.send(json.dumps({"type": "stop_audio_stream"}))
        stopped_msg = json.loads(await ws.recv())
        assert stopped_msg["type"] == "audio_stream_stopped"
        assert stopped_msg["total_chunks"] == total_chunks
        assert stopped_msg["total_bytes"] == total_chunks * chunk_size
        print(f"[SUCCESS] Received audio_stream_stopped: {stopped_msg}")

        # 7. Clean disconnect
        await ws.send(json.dumps({"type": "close"}))

    print("\n>>> ALL WEBSOCKET AUDIO STREAMING TESTS PASSED! <<<")

if __name__ == "__main__":
    asyncio.run(test_audio_streaming())
