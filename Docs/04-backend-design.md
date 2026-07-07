# Backend Design — Digital Signage / Multi-Screen CMS

## 1. Tech Stack

- **FastAPI** — REST API framework, ASGI
- **SQLAlchemy** — ORM against Supabase Postgres
- **Supabase Python SDK** — Storage uploads (and optionally direct Postgres access alongside SQLAlchemy)
- **JWT** (`python-jose` or `PyJWT`) — admin authentication tokens
- **bcrypt** (`passlib[bcrypt]`) — password hashing
- **python-socketio** — WebSocket layer, mounted on the FastAPI ASGI app

## 2. Folder Structure

```
backend/
├── main.py                        # FastAPI app instantiation, mounts routers + socket.io ASGI app
├── config.py                      # env-based settings (Supabase URL/keys, JWT secret, etc.)
│
├── routers/
│   ├── auth_router.py             # POST /api/auth/login
│   ├── apps_router.py             # /api/apps CRUD
│   ├── contents_router.py         # /api/apps/:appId/contents CRUD + reorder
│   ├── screens_router.py          # /api/screens CRUD
│   ├── session_router.py          # /api/session/state, /activate, /next, /previous
│   ├── settings_router.py         # /api/settings (default screen)
│   └── upload_router.py           # /api/uploads (media -> Supabase Storage)
│
├── models/                        # SQLAlchemy ORM models
│   ├── admin.py
│   ├── app.py
│   ├── content.py
│   ├── screen.py
│   ├── session.py
│   └── settings.py
│
├── schemas/                       # Pydantic request/response models
│   ├── auth_schema.py
│   ├── app_schema.py
│   ├── content_schema.py
│   ├── screen_schema.py
│   ├── session_schema.py
│   └── settings_schema.py
│
├── services/                      # business logic, framework-agnostic
│   ├── auth_service.py            # bcrypt verify, JWT encode/decode
│   ├── app_service.py             # activate app (sets session.active_app_id, resets batch)
│   ├── content_service.py         # CRUD + reorder logic
│   ├── screen_service.py          # CRUD, recompute active screen ordering
│   ├── session_service.py         # next/previous batch math, current state assembly
│   ├── settings_service.py        # default screen config CRUD
│   └── distribution_service.py    # pure function: compute per-screen slide assignment
│
├── db/
│   ├── database.py                # SQLAlchemy engine/session, get_db dependency
│   └── base.py                    # declarative base, import hub for models
│
├── storage/
│   └── supabase_storage.py        # upload_file(bucket, file) -> public_url
│
├── auth/
│   ├── jwt_handler.py             # create_access_token, decode_access_token
│   ├── password_handler.py        # hash_password, verify_password
│   └── dependencies.py            # get_current_admin (FastAPI Depends)
│
└── websocket/
    ├── socket_manager.py          # socketio.AsyncServer instance, ASGI wrapper
    └── events.py                  # emit_app_activated, emit_batch_changed, emit_content_updated, etc.
```

## 3. Layering Principles

- **Routers** are thin: parse/validate request via Pydantic schema, call a service function, return the service's result mapped to a response schema. No business logic in routers.
- **Services** contain all business rules (e.g., "activating an app resets batch to 0", "removing a screen re-ranks remaining screens", "reordering slides renormalizes `display_order`"). Services are the only layer that calls both the DB and the WebSocket emitter, so every state-changing action is DB-write-then-broadcast in one place — no route ever forgets to notify sockets.
- **Models** are pure SQLAlchemy table definitions with relationships; no logic beyond simple computed properties if needed.
- **Schemas** define strict input/output contracts (Pydantic), decoupled from ORM models, so internal DB shape can evolve without breaking the API contract.

## 4. Authentication & Authorization

- `POST /api/auth/login` — accepts `username` + `password`; `auth_service` looks up `admins` by username, verifies with `password_handler.verify_password` (bcrypt); on success issues a JWT (`jwt_handler.create_access_token`) containing `sub=admin.id` and an expiry.
- `auth/dependencies.get_current_admin` — a FastAPI dependency that extracts the `Authorization: Bearer <token>` header, decodes/validates the JWT, loads the admin, and raises `401` if invalid/expired. Injected into every admin-only route (`apps`, `contents`, `screens`, `settings`, `upload` mutation endpoints).
- Public routers (`session_router` GET endpoints, and GET endpoints on `apps_router`/`contents_router`/`screens_router` used by Dashboard/TV) require **no** dependency — deliberately open, per requirements ("no login required" for dashboard/TV).
- Passwords are **never** stored or logged in plaintext; only `password_hash` persists.

## 5. Core Service Logic

### 5.1 `app_service.activate_app(app_id)`
1. Set all other apps' `is_active = false`, set target `is_active = true` (or simply track via `session.active_app_id` as the single source of truth — `apps.is_active` can be a denormalized convenience flag kept in sync for dashboard highlighting).
2. Update `session.active_app_id = app_id`, `session.current_batch = 0`.
3. Emit `app:activated` via `websocket/events.py`.

### 5.2 `session_service.next()` / `session_service.previous()`
1. Load singleton `session` row.
2. `next`: `current_batch += 1`. `previous`: `current_batch = max(0, current_batch - 1)`.
3. Persist, emit `batch:changed` with new `current_batch`.
4. (Optional optimization) Service can also compute and include the full per-screen assignment in the payload so clients don't need a round-trip — see `distribution_service` below.

### 5.3 `distribution_service.compute_assignment(active_app_id, current_batch)`
Pure function, used both by `session_router`'s `GET /api/session/state` (for a fresh page load) and optionally embedded in socket payloads:

```python
def compute_assignment(slides: list[Content], screens: list[Screen], current_batch: int) -> dict[int, Content | None]:
    number_of_screens = len(screens)
    start_index = current_batch * number_of_screens
    assignment = {}
    for position_index, screen in enumerate(screens):
        slide_index = start_index + position_index
        assignment[screen.id] = slides[slide_index] if slide_index < len(slides) else None
    return assignment
```

- `screens` passed in are pre-filtered to `is_active = true` and pre-sorted by `screen_number`.
- Returns `None` for a screen's slide when out of range → router/service maps this to the configured Default Screen payload before responding.

### 5.4 `content_service.reorder(app_id, ordered_content_ids)`
- Accepts an explicit ordered list of content IDs from the admin's drag-and-drop UI.
- Rewrites `display_order` sequentially (0..n-1) in a single transaction.
- Emits `content:updated`.

### 5.5 `screen_service` add/remove/rename
- On any mutation, re-fetches active screens sorted by `screen_number` (this ordering is computed on read, always — there's no stored "position index"; position is always derived at query time so it can never go stale).
- Emits `screen:updated` — TVs recompute their own assignment on receipt.

## 6. WebSocket Layer

- `websocket/socket_manager.py` creates a single `socketio.AsyncServer(async_mode="asgi")`, wrapped with `socketio.ASGIApp` and mounted alongside the FastAPI app in `main.py` (e.g. `app.mount("/socket.io", socket_asgi_app)`).
- `websocket/events.py` exposes simple emitter functions (`emit_app_activated(payload)`, `emit_batch_changed(payload)`, `emit_content_updated(payload)`, `emit_screen_updated(payload)`, `emit_settings_updated(payload)`) called from services — this keeps Socket.IO specifics out of business logic call sites.
- No authentication is required to *receive* broadcast events (TVs and dashboard are public), but the socket server can still validate a lightweight handshake token if origin restriction becomes necessary later.

## 7. File Uploads / Storage

- `storage/supabase_storage.py` wraps the Supabase Python SDK: `upload_file(bucket_name, file_bytes, filename) -> public_url`.
- Buckets: `app-icons`, `slide-media` (images/videos/pdfs), `default-screen`.
- `upload_router.py` — protected endpoint(s) used by the Admin panel: accepts `multipart/form-data`, delegates to the storage adapter, returns the resulting public URL, which the frontend then submits as `icon_url` / `file_url` on the corresponding create/update call.
- **Database never stores binary data** — only the returned URL strings, per requirements.

## 8. Database Access

- `db/database.py` sets up a SQLAlchemy engine pointed at the Supabase Postgres connection string (from `config.py`/env vars), with a `get_db()` FastAPI dependency yielding a scoped session per request.
- All models declared against a shared `Base` (`db/base.py`) so Alembic (or Supabase migrations) can manage schema evolution centrally.

## 9. Error Handling

- Centralized exception handlers in `main.py` for: `HTTPException` (pass-through), `RequestValidationError` (422 with field detail), and a catch-all 500 handler that logs and returns a generic error body (no stack traces leaked to clients).
- Service-layer functions raise domain-specific exceptions (e.g. `AppNotFoundError`, `ScreenNotFoundError`) that routers translate to appropriate HTTP status codes — keeps HTTP concerns out of services while still producing correct API responses.

## 10. Configuration & Environments

- `config.py` reads from environment variables (12-factor style): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `CORS_ORIGINS`.
- CORS configured permissively enough for the dashboard/TV/admin SPA origin(s), but not wide open to arbitrary origins in production.
