# System Architecture — Digital Signage / Multi-Screen CMS

## 1. High-Level Architecture

```
                                   ┌───────────────────────────┐
                                   │        Supabase           │
                                   │  ┌─────────────────────┐  │
                                   │  │ PostgreSQL (data)    │  │
                                   │  └─────────────────────┘  │
                                   │  ┌─────────────────────┐  │
                                   │  │ Storage (media files)│ │
                                   │  └─────────────────────┘  │
                                   └───────────▲───────────────┘
                                               │ SQLAlchemy / Supabase SDK
                                               │
                     ┌─────────────────────────┴──────────────────────────┐
                     │                 FastAPI Backend                    │
                     │  ┌───────────┐ ┌───────────┐ ┌──────────────────┐  │
                     │  │  Routers  │ │  Services │ │  WebSocket Hub   │  │
                     │  │ (REST)    │ │ (business │ │ (Socket.IO ASGI) │  │
                     │  │           │ │  logic)   │ │                  │  │
                     │  └───────────┘ └───────────┘ └──────────────────┘  │
                     │  ┌───────────┐ ┌───────────┐ ┌──────────────────┐  │
                     │  │   Auth    │ │  Storage  │ │   DB Session /   │  │
                     │  │ (JWT/     │ │  Adapter  │ │   Models         │  │
                     │  │  bcrypt)  │ │           │ │                  │  │
                     │  └───────────┘ └───────────┘ └──────────────────┘  │
                     └───────────▲───────────────────────────▲────────────┘
                                 │ REST + WS                 │ REST + WS
                 ┌───────────────┴───────────────┐   ┌───────┴────────────────┐
                 │     Public Dashboard (React)   │   │   TV Client (React)    │
                 │  /            → App cards      │   │  /tv/:screenId         │
                 │  Next / Previous controls       │   │  Fullscreen kiosk      │
                 └─────────────────────────────────┘   └──────────┬──────────────┘
                                                                    │ (× N screens,
                                                                    │  N variable)
                                                          ┌─────────▼─────────┐
                                                          │  Admin Panel (React)│
                                                          │  /admin (JWT login) │
                                                          └─────────────────────┘
```

All three frontend surfaces (Dashboard, TV, Admin) are the **same React application**, split by route, sharing services/hooks/contexts. This keeps content-type rendering, API clients, and socket handling in one codebase.

## 2. Component Responsibilities

| Layer | Responsibility |
|---|---|
| **Dashboard (public)** | List Apps, activate an App, trigger Next/Previous (global session control) |
| **TV Client (public, kiosk)** | Resolve its own screen identity → compute assigned slide → render correct content component → listen for realtime updates |
| **Admin Panel (auth)** | CRUD for Apps, Slides, Screens, Default Screen settings; file uploads to Supabase Storage |
| **FastAPI Routers** | Thin HTTP layer: validate request/response schemas, delegate to services |
| **Services** | All business logic: distribution algorithm, session mutation, cascading side effects, broadcasting websocket events |
| **WebSocket Hub** | Maintains connected clients (dashboard + all TVs), broadcasts typed events on any state-changing mutation |
| **Auth** | JWT issuance/validation, bcrypt password hashing, `get_current_admin` dependency for protected routes |
| **Storage Adapter** | Wraps Supabase Storage SDK: upload file → return public URL, used by admin upload endpoints |
| **Database (Supabase Postgres)** | Source of truth for Apps, Contents, Screens, Session, Settings, Admins |

## 3. The Content Distribution Algorithm (Core Logic)

This algorithm lives in one place on the backend (a pure function in `services/distribution.py`) and is **mirrored** on the frontend only for optimistic/instant rendering — the backend value is always authoritative and pushed via WebSocket.

### Inputs
- `activeApp.slides`: ordered list of Content items (`display_order` ascending) for the currently active App.
- `screens`: ordered list of active Screens (ordered by `screen_number` ascending).
- `session.current_batch`: integer, starts at 0.

### Algorithm

```
numberOfScreens = len(screens)                       # dynamic, recalculated every time
startIndex      = current_batch * numberOfScreens

for screenPositionIndex, screen in enumerate(screens):
    slideIndex = startIndex + screenPositionIndex
    if slideIndex < len(activeApp.slides):
        screen.currentSlide = activeApp.slides[slideIndex]
    else:
        screen.currentSlide = DEFAULT_SCREEN
```

### Worked Example (from requirements)

`numberOfScreens = 4`, 10 slides, batch starts at 0.

| Batch | startIndex | TV1 (i=0) | TV2 (i=1) | TV3 (i=2) | TV4 (i=3) |
|---|---|---|---|---|---|
| 0 | 0 | Slide 1 | Slide 2 | Slide 3 | Slide 4 |
| 1 | 4 | Slide 5 | Slide 6 | Slide 7 | Slide 8 |
| 2 | 8 | Slide 9 | Slide 10 | Default | Default |

### Next / Previous

- **Next**: `current_batch += 1`. No upper clamp is required functionally (slides simply run out → Default Screen for all), but the UI may disable/hide Next once every screen would show Default, to avoid pointless clicks — this is a UX nicety, not a correctness requirement.
- **Previous**: `current_batch = max(0, current_batch - 1)`.
- Both mutate the single `session` row's `current_batch`, then broadcast `session:updated` over WebSocket with the full recomputed per-screen assignment (or the raw ingredients: `activeAppId`, `current_batch`, `screens[]`, `slides[]` — clients recompute locally for instant paint, and it's re-validated against backend truth on reconnect).

### Screen Identity Resolution

- Every screen row has a stable `screen_number` (admin-assigned, e.g. 1, 2, 3...) and its `/tv/:screenId` route param is that `screen_number` (or the row's `id` — `screen_number` is preferred for human-friendly URLs).
- The **position index `i`** used in the formula is **not** the `screen_number` itself — it's the screen's rank (0-based) within the *currently active* screens list, ordered by `screen_number`. This matters because:
  - If screens 1, 2, 3, 4 exist and screen 2 is deactivated/removed, the remaining active screens (1, 3, 4) re-rank as positions 0, 1, 2 — batch size shrinks to 3 automatically.
  - This is what makes "the number of TVs is not fixed" work transparently: adding/removing screens just changes `numberOfScreens` and the ranking, nothing else in the algorithm changes.

## 4. Global Session State

A single-row `session` table is the system's heartbeat:

```
session {
  id: 1 (singleton row)
  active_app_id: FK -> apps.id | null
  current_batch: int
  updated_at: timestamp
}
```

- Activating an App: `active_app_id = <app.id>`, `current_batch = 0`, broadcast `session:app_changed`.
- Next/Previous: mutate `current_batch`, broadcast `session:batch_changed`.
- This table is intentionally tiny and hot — it's read on every TV page load and written on every dashboard interaction.

## 5. Realtime Design

**Transport**: Socket.IO (server: `python-socketio` mounted on the FastAPI ASGI app; client: `socket.io-client`).

**Rooms/Channels**:
- All TV clients and the dashboard join a single broadcast room (`signage`) — the office deployment is small-scale (single office, ≤10ish screens), so a single room is sufficient and simplest. (Multi-tenant/multi-office would introduce per-tenant rooms — out of scope for v1.)

**Events (server → client)**:
| Event | Payload | Emitted when |
|---|---|---|
| `app:activated` | `{ activeAppId, currentBatch }` | Dashboard activates an App |
| `batch:changed` | `{ currentBatch }` | Next/Previous pressed |
| `content:updated` | `{ appId }` | Admin creates/edits/deletes/reorders a slide in that App |
| `screen:updated` | `{}` | Admin adds/removes/renames a screen |
| `settings:updated` | `{}` | Admin changes Default Screen config |

**Client behavior**: on receipt of any event, TV clients re-fetch (or use the pushed payload) and recompute their assigned slide via the shared distribution function, then re-render — no page reload, just React state update.

**Reconnection**: on socket reconnect (e.g., after network drop / TV reboot), client always does a fresh `GET /api/session/state` (see API design doc) before trusting further push events, to avoid drift.

## 6. Data Flow Summary

1. **Admin** uploads media → Storage Adapter → Supabase Storage → returns public URL → saved in `contents.file_url`.
2. **Admin/Dashboard** action → REST API → Service layer mutates DB (Postgres) → Service layer emits WebSocket event.
3. **TV clients** (already connected) receive event → recompute assignment → render.
4. **New/reconnecting TV** → `GET /api/session/state` + `GET /api/screens` + `GET /api/apps/:id/contents` → compute assignment locally → render → subscribe to socket.

## 7. Extensibility Points

| Extension | How the architecture supports it |
|---|---|
| New content type (e.g. "Weather Widget") | Add enum value to `contents.type`; add a new `<WeatherSlide>` component registered in the frontend's content-type registry map. No changes to distribution logic. |
| More screens | Purely a `screens` table row count change — algorithm auto-adapts. |
| Scheduling (time-based App switching) | Add a scheduler service that calls the same "activate app" service function used by the dashboard — no core changes. |
| Multi-office / multi-tenant | Introduce `organization_id` FK across tables and Socket.IO rooms keyed by org — noted as a clean seam, not built in v1. |
| Analytics | `session` state changes could be appended to a history/log table instead of overwritten — additive change. |

## 8. Deployment Topology (indicative)

- **Frontend**: static build (Vite) served via CDN/static hosting; three route groups (`/`, `/tv/:id`, `/admin/*`) in one SPA.
- **Backend**: FastAPI (Uvicorn/Gunicorn) as a single ASGI service, hosting REST + Socket.IO.
- **Database & Storage**: Supabase-managed Postgres + Storage buckets (e.g., `app-icons`, `slide-media`, `default-screen`).
- **Screens**: each physical TV is a browser (or embedded webview) permanently navigated to `https://<host>/tv/<screen_number>`, ideally in kiosk mode at the OS level (in addition to the app's own fullscreen/kiosk CSS/JS behavior).
