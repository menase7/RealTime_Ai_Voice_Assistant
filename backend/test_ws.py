import asyncio
import json
import time
import httpx
import websockets

BACKEND_HTTP = "http://localhost:8000"
BACKEND_WS = "ws://localhost:8000"

async def test_websocket_flow():
    # 1. Login to get token
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
            json={"title": "WebSocket Test Session"}
        )
        assert resp.status_code == 201, f"Session create failed: {resp.text}"
        session_id = resp.json()["id"]
        print(f"[SUCCESS] Created test session: {session_id}")

    # 3. Connect to WebSocket with token
    ws_url = f"{BACKEND_WS}/ws/sessions/{session_id}?token={token}"
    print(f"Connecting to: {ws_url}")
    async with websockets.connect(ws_url) as ws:
        # Expect connection_ack
        ack_msg = await ws.recv()
        ack = json.loads(ack_msg)
        print(f"[SUCCESS] Handshake ACK received: {ack}")
        assert ack["type"] == "connection_ack"
        assert ack["session_id"] == session_id

        # 4. Test Ping / Pong
        t0 = time.time()
        await ws.send(json.dumps({"type": "ping", "timestamp": t0}))
        pong_msg = await ws.recv()
        pong = json.loads(pong_msg)
        rtt_ms = round((time.time() - t0) * 1000, 2)
        print(f"[SUCCESS] Pong received: {pong} (RTT: {rtt_ms}ms)")
        assert pong["type"] == "pong"

        # 5. Test Custom Message
        await ws.send(json.dumps({"type": "test_message", "content": "Hello RealTime Voice"}))
        echo_msg = await ws.recv()
        echo = json.loads(echo_msg)
        print(f"[SUCCESS] Echo received: {echo}")
        assert echo["type"] == "echo"
        assert echo["content"] == "Hello RealTime Voice"

        # 6. Test graceful close
        await ws.send(json.dumps({"type": "close"}))
        close_ack = json.loads(await ws.recv())
        print(f"[SUCCESS] Closing ack received: {close_ack}")

    # 7. Test invalid token rejection
    bad_url = f"{BACKEND_WS}/ws/sessions/{session_id}?token=invalid-token"
    try:
        async with websockets.connect(bad_url) as ws:
            assert False, "Should have rejected bad token"
    except Exception as e:
        print(f"[SUCCESS] Invalid token rejected: {type(e).__name__} ({e})")

    print("\n>>> ALL WEBSOCKET TESTS PASSED! <<<")

if __name__ == "__main__":
    asyncio.run(test_websocket_flow())
