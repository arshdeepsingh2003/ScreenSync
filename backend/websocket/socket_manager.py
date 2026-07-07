import socketio
from typing import Any
import asyncio

# Create the Socket.IO server with support for CORS from any origin
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# Wrap the Socket.IO server in an ASGI application.
# Set socketio_path="" so that it acts as the root handler when mounted on a specific prefix in FastAPI.
socket_app = socketio.ASGIApp(sio, socketio_path="")

# Keep a reference to the main event loop to safely dispatch from sync code threads
_main_loop = None

def set_main_loop(loop: asyncio.AbstractEventLoop):
    global _main_loop
    _main_loop = loop

def get_main_loop():
    return _main_loop

@sio.event
async def connect(sid: str, environ: Any) -> None:
    # All connections automatically join the 'signage' room for global broadcasting
    await sio.enter_room(sid, "signage")
    print(f"Socket connection established: {sid}, joined room 'signage'")

@sio.event
async def disconnect(sid: str) -> None:
    print(f"Socket connection closed: {sid}")
