import asyncio
from backend.websocket.socket_manager import sio, get_main_loop

def run_async_coroutine(coro):
    """
    Helper function to execute an async coroutine from either a synchronous context
    (like a sync service call in a thread pool) or an asynchronous context.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Already running in the event loop of the current thread
        asyncio.create_task(coro)
    else:
        # Running in a separate thread (e.g. FastAPI threadpool), delegate to main loop
        main_loop = get_main_loop()
        if main_loop and main_loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, main_loop)
        else:
            # Fallback if no loop is running or during standalone testing
            asyncio.run(coro)

def emit_app_activated(active_app_id: int | None, current_batch: int = 0):
    """Broadcast 'app:activated' event to the signage room."""
    payload = {
        "active_app_id": active_app_id,
        "current_batch": current_batch
    }
    run_async_coroutine(sio.emit("app:activated", payload, room="signage"))

def emit_batch_changed(current_batch: int):
    """Broadcast 'batch:changed' event to the signage room."""
    payload = {
        "current_batch": current_batch
    }
    run_async_coroutine(sio.emit("batch:changed", payload, room="signage"))

def emit_content_updated(app_id: int):
    """Broadcast 'content:updated' event to the signage room."""
    payload = {
        "app_id": app_id
    }
    run_async_coroutine(sio.emit("content:updated", payload, room="signage"))

def emit_screen_updated():
    """Broadcast 'screen:updated' event to the signage room."""
    run_async_coroutine(sio.emit("screen:updated", {}, room="signage"))

def emit_settings_updated(default_screen_type: str, default_screen_url: str | None, default_screen_text: str | None):
    """Broadcast 'settings:updated' event to the signage room."""
    payload = {
        "default_screen_type": default_screen_type,
        "default_screen_url": default_screen_url,
        "default_screen_text": default_screen_text
    }
    run_async_coroutine(sio.emit("settings:updated", payload, room="signage"))
