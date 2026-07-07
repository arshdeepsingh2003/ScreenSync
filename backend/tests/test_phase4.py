import os
import sys
import time
import socket
import threading
import asyncio
import httpx
import socketio

# Add the project root to sys.path to allow absolute imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app
from backend.config import settings

# A thread class to run the Uvicorn server in the background
class UvicornServerThread(threading.Thread):
    def __init__(self, host: str, port: int):
        super().__init__()
        self.host = host
        self.port = port
        self.server = None

    def run(self):
        import uvicorn
        config = uvicorn.Config(app, host=self.host, port=self.port, log_level="warning")
        self.server = uvicorn.Server(config)
        self.server.run()

    def stop(self):
        if self.server:
            self.server.should_exit = True

def get_free_port() -> int:
    """Helper to find a free port on localhost."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port

async def main_test_flow():
    print("Starting Phase 4 WebSocket Realtime Layer Tests...")

    # 1. Spin up background server
    host = "127.0.0.1"
    port = get_free_port()
    server_thread = UvicornServerThread(host, port)
    server_thread.daemon = True
    server_thread.start()

    # Wait for the server to spin up
    time.sleep(2.0)
    base_url = f"http://{host}:{port}/api"
    print(f"Backend test server running at {base_url}")

    # Set up event logging container
    received_events = []
    
    # Create Socket.IO AsyncClient
    sio = socketio.AsyncClient()

    # Define event handlers to record broadcasts
    @sio.on("app:activated")
    def on_app_activated(data):
        print(f"[WS Event] app:activated -> {data}")
        received_events.append(("app:activated", data))

    @sio.on("batch:changed")
    def on_batch_changed(data):
        print(f"[WS Event] batch:changed -> {data}")
        received_events.append(("batch:changed", data))

    @sio.on("content:updated")
    def on_content_updated(data):
        print(f"[WS Event] content:updated -> {data}")
        received_events.append(("content:updated", data))

    @sio.on("screen:updated")
    def on_screen_updated(data):
        print(f"[WS Event] screen:updated -> {data}")
        received_events.append(("screen:updated", data))

    @sio.on("settings:updated")
    def on_settings_updated(data):
        print(f"[WS Event] settings:updated -> {data}")
        received_events.append(("settings:updated", data))

    try:
        # 2. Connect client to Socket.IO server
        # Mount prefix is "/socket.io" and socketio_path is "", so path="socket.io" matches.
        await sio.connect(f"http://{host}:{port}", socketio_path="socket.io")
        print("Connected to Socket.IO server successfully.")

        # 3. Authenticate with REST API to get token for mutations
        async with httpx.AsyncClient() as client:
            login_resp = await client.post(
                f"{base_url}/auth/login",
                json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_PASSWORD}
            )
            assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
            token = login_resp.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # --- Test 1: Screen mutation -> screen:updated ---
            print("\nTesting screen:updated event...")
            received_events.clear()
            screen_resp = await client.post(
                f"{base_url}/screens",
                json={"screen_number": 888, "screen_name": "Test Screen WS"},
                headers=headers
            )
            assert screen_resp.status_code == 201, f"Failed to create screen: {screen_resp.text}"
            screen_id = screen_resp.json()["id"]

            # Give a small window for socket propagation
            await asyncio.sleep(0.5)
            assert len(received_events) == 1
            assert received_events[0][0] == "screen:updated"
            print("screen:updated event verified!")

            # --- Test 2: App activation -> app:activated ---
            print("\nTesting app:activated event...")
            
            # Setup a test App
            app_resp = await client.post(
                f"{base_url}/apps",
                json={"name": "Test App WS"},
                headers=headers
            )
            assert app_resp.status_code == 201
            app_id = app_resp.json()["id"]

            received_events.clear()
            activate_resp = await client.post(
                f"{base_url}/apps/{app_id}/activate"
            )
            assert activate_resp.status_code == 200

            await asyncio.sleep(0.5)
            assert len(received_events) == 1
            assert received_events[0][0] == "app:activated"
            assert received_events[0][1]["active_app_id"] == app_id
            assert received_events[0][1]["current_batch"] == 0
            print("app:activated event verified!")

            # --- Test 3: Session next/previous -> batch:changed ---
            print("\nTesting batch:changed event...")
            received_events.clear()
            next_resp = await client.post(f"{base_url}/session/next")
            assert next_resp.status_code == 200
            
            await asyncio.sleep(0.5)
            assert len(received_events) == 1
            assert received_events[0][0] == "batch:changed"
            assert received_events[0][1]["current_batch"] == 1
            print("batch:changed event verified!")

            # --- Test 4: Content slide mutation -> content:updated ---
            print("\nTesting content:updated event...")
            received_events.clear()
            slide_resp = await client.post(
                f"{base_url}/apps/{app_id}/contents",
                json={"title": "Test Slide WS", "type": "text", "text_content": "WS Test"},
                headers=headers
            )
            assert slide_resp.status_code == 201

            await asyncio.sleep(0.5)
            assert len(received_events) == 1
            assert received_events[0][0] == "content:updated"
            assert received_events[0][1]["app_id"] == app_id
            print("content:updated event verified!")

            # --- Test 5: Settings update -> settings:updated ---
            print("\nTesting settings:updated event...")
            received_events.clear()
            settings_resp = await client.put(
                f"{base_url}/settings",
                json={
                    "default_screen_type": "text",
                    "default_screen_text": "Updated Default WS text"
                },
                headers=headers
            )
            assert settings_resp.status_code == 200

            await asyncio.sleep(0.5)
            assert len(received_events) == 1
            assert received_events[0][0] == "settings:updated"
            assert received_events[0][1]["default_screen_type"] == "text"
            assert received_events[0][1]["default_screen_text"] == "Updated Default WS text"
            print("settings:updated event verified!")

            # --- Cleanup test data ---
            print("\nCleaning up DB records...")
            await client.delete(f"{base_url}/screens/{screen_id}", headers=headers)
            await client.delete(f"{base_url}/apps/{app_id}", headers=headers)

    except Exception as e:
        print(f"\n[FAIL] Test encountered error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        print("\nClosing connection and stopping server...")
        if sio.connected:
            await sio.disconnect()
        server_thread.stop()
        # Wait a moment for server to clean up
        time.sleep(1.0)

    print("\nAll Phase 4 WebSocket Realtime Layer Tests Passed Successfully! [PASSED]")

if __name__ == "__main__":
    asyncio.run(main_test_flow())
