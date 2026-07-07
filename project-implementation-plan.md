# Implementation Plan — Digital Signage / Multi-Screen CMS

This plan sequences the build described in `01-product-overview.md` through `06-api-design.md` into concrete, dependency-ordered phases. Each phase has a goal, tasks, and a "Definition of Done" so progress can be checked before moving on. The plan is designed so that **the core distribution algorithm and realtime layer are proven early** (highest technical risk), before UI polish work.

---

## 0. Guiding Principles for the Build

1. **Backend-first for the core algorithm.** The batch × screen-count distribution logic is the single most important piece of business logic — it gets built, unit-tested, and manually verified via API before any frontend TV rendering is attempted.
2. **Vertical slices, not horizontal layers.** Each phase delivers a working, demoable slice (e.g. "Apps CRUD end-to-end," not "all models, then all schemas, then all routers").
3. **Realtime is not an afterthought.** WebSocket broadcasting is wired in from Phase 2 onward, alongside each mutation, rather than bolted on at the end.
4. **Public vs Admin split enforced from day one.** Auth middleware exists before any admin route is written, so nothing is accidentally left open or accidentally locked down.
5. **Supabase from the start.** No local SQLite/mock DB detour — connect to real Supabase Postgres + Storage immediately to avoid a painful migration later.

---

## 1. Phase 0 — Project Setup & Environment

**Goal**: Both repos scaffolded, connected to Supabase, running locally, talking to each other.

### Tasks
- [ ] Create Supabase project; capture `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
- [ ] Create Storage buckets: `app-icons`, `slide-media`, `default-screen`.
- [ ] Scaffold backend: `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary`, `python-socketio`, `python-jose`/`PyJWT`, `passlib[bcrypt]`, `python-multipart`, `supabase` SDK.
- [ ] Scaffold frontend: `npm create vite@latest` (React), install `tailwindcss`, `react-router-dom`, `axios`, `socket.io-client`.
- [ ] Set up `.env` / `.env.example` on both sides (never commit real secrets).
- [ ] Configure CORS on backend for the Vite dev origin.
- [ ] Establish the folder structures exactly as defined in `03-frontend-design.md` §3 and `04-backend-design.md` §2 (empty placeholder files are fine at this stage).
- [ ] Health-check route (`GET /api/health`) and a bare `App.jsx` that fetches it, to confirm end-to-end connectivity.

### Definition of Done
Frontend dev server renders "Backend connected ✅" by calling a real FastAPI endpoint, which itself confirms a live Supabase Postgres connection.

---

## 2. Phase 1 — Database Schema & Models

**Goal**: All six tables exist in Supabase, ORM models match, seed data loads.

### Tasks
- [ ] Write SQLAlchemy models: `Admin`, `App`, `Content`, `Screen`, `Session`, `Settings` (per `05-database-schema.md` §2).
- [ ] Set up Alembic (or raw SQL migration scripts) for schema versioning against Supabase Postgres.
- [ ] Apply indexes: `idx_contents_app_order`, `idx_screens_active_number`, partial unique index on `apps.is_active` (optional but recommended).
- [ ] Seed: one `session` row (`id=1`, `active_app_id=null`, `current_batch=0`), one `settings` row (`id=1`, a default type/content), one bootstrap `admins` row (bcrypt-hashed password from env var or a one-off seed script — never hardcode a plaintext default in source).
- [ ] Verify FK cascade behavior manually: deleting an App deletes its Contents; deleting the active App nulls `session.active_app_id`.

### Definition of Done
A DB browser (Supabase Studio) shows all 6 tables with correct columns/constraints; seed rows are present; a manual delete test confirms cascade/null behavior works as specified.

---

## 3. Phase 2 — Auth & Core CRUD APIs (Apps, Contents, Screens, Settings)

**Goal**: Every REST endpoint in `06-api-design.md` §§1–6 works, admin routes are protected, public routes are open.

### Tasks
- [ ] `auth/password_handler.py`, `auth/jwt_handler.py`, `auth/dependencies.py` (`get_current_admin`).
- [ ] `POST /api/auth/login` — verify against seeded admin, issue JWT.
- [ ] Pydantic schemas for all 6 resources (request + response variants where they differ).
- [ ] `apps_router` + `app_service`: full CRUD + `activate` action (resets `session.current_batch` to 0).
- [ ] `contents_router` + `content_service`: CRUD + `reorder` bulk endpoint.
- [ ] `screens_router` + `screen_service`: CRUD.
- [ ] `settings_router` + `settings_service`: get/update default screen config.
- [ ] `upload_router` + `storage/supabase_storage.py`: multipart upload → Supabase Storage → return public URL.
- [ ] Central exception handlers (`HTTPException`, `RequestValidationError`, catch-all 500) per `04-backend-design.md` §9.
- [ ] Apply `get_current_admin` dependency to every mutation endpoint; leave all GETs and `activate`/`next`/`previous` public per the access table in `06-api-design.md` §10.

### Definition of Done
Every endpoint in the API design doc is callable via Postman/curl/Swagger (`/docs`) with correct status codes; admin routes correctly reject missing/invalid JWT with `401`; a file upload returns a working public URL.

---

## 4. Phase 3 — Session State & the Distribution Algorithm (Highest-Risk Core Logic)

**Goal**: The batch × screen-count algorithm is implemented, unit-tested, and exposed via API — proven correct before any UI touches it.

### Tasks
- [ ] `distribution_service.compute_assignment(slides, screens, current_batch)` exactly as specified in `04-backend-design.md` §5.3.
- [ ] Unit tests covering the worked example from `02-system-architecture.md` §3 (4 screens, 10 slides, batches 0/1/2 including the partial-Default-Screen case).
- [ ] Unit test for the **dynamic screen count** case: remove a screen mid-list, confirm remaining screens re-rank (0,1,2,...) and batch size shrinks automatically.
- [ ] `session_service.next()` / `previous()` (floor at 0).
- [ ] `GET /api/session/state` — assembles `active_app_id`, `current_batch`, ordered active `screens`, and the computed `assignment` map (with `null` → to be resolved against `settings` on the client, or resolved server-side into a full Default Screen payload — pick one and document it consistently with `06-api-design.md` §5).
- [ ] `POST /api/session/next`, `POST /api/session/previous`.

### Definition of Done
Automated tests pass for: exact-fit batches, partial-fit batches (Default Screen fallback), Previous floor-at-zero, and screen add/remove re-ranking — all matching the worked example in the architecture doc exactly.

---

## 5. Phase 4 — WebSocket Realtime Layer

**Goal**: Every state-changing action from Phase 2/3 broadcasts a typed event; a simple socket client (even a test HTML page) can observe it live.

### Tasks
- [ ] `websocket/socket_manager.py` — `socketio.AsyncServer`, mounted on the FastAPI ASGI app (`/socket.io`).
- [ ] `websocket/events.py` — emitter functions per `06-api-design.md` §8: `app:activated`, `batch:changed`, `content:updated`, `screen:updated`, `settings:updated`.
- [ ] Wire emitters into the *end* of each corresponding service function (activate, next/previous, content CRUD/reorder, screen CRUD, settings update) — never in routers directly, per the layering principle in `04-backend-design.md` §3.
- [ ] Single shared `signage` room; all connections auto-join on connect (no auth needed to receive, per public TV/dashboard requirement).
- [ ] Manual test: two browser tabs with a minimal Socket.IO client, confirm both receive events in real time when hitting the REST endpoints from Phase 2/3.

### Definition of Done
Triggering any admin mutation or dashboard action via REST produces the correct event, with the correct payload shape, observed simultaneously by multiple connected clients.

---

## 6. Phase 5 — Frontend Foundation (Shared Infrastructure)

**Goal**: Routing, contexts, services, and the client-side distribution mirror are in place before building any page.

### Tasks
- [ ] `App.jsx` route table: `/`, `/tv/:screenId`, `/admin/login`, `/admin/*` (guarded).
- [ ] `services/api.js` — Axios instance with JWT interceptor (attach header, handle 401 → redirect/logout).
- [ ] `services/*Service.js` — thin wrappers per resource matching `06-api-design.md`.
- [ ] `contexts/AuthContext.jsx` — token storage, `login()`/`logout()`, `RequireAuth` wrapper for `/admin/*`.
- [ ] `contexts/SocketContext.jsx` — single Socket.IO connection, exposed via `useSocket()`.
- [ ] `contexts/SessionContext.jsx` — holds `activeApp`, `currentBatch`, `screens`, `slides`; initial REST fetch + socket-driven patches; forces full resync on `reconnect`.
- [ ] `utils/distribution.js` — pure client-side mirror of the backend algorithm (for instant optimistic rendering on `batch:changed`).
- [ ] `utils/contentTypeRegistry.js` — maps `type` string → slide component (stub components acceptable at this stage).
- [ ] Tailwind config: dark theme tokens (per `03-frontend-design.md` §10), shared across Dashboard/Admin; TV mode always forces pure black regardless of theme.

### Definition of Done
A logged-out user hitting `/admin` is redirected to `/admin/login`; a logged-in admin can navigate `/admin/*`; `SessionContext` correctly reflects a manual REST/socket test from Phase 4 in React DevTools.

---

## 7. Phase 6 — Public Dashboard

**Goal**: The dashboard from `03-frontend-design.md` §7 is fully functional end-to-end.

### Tasks
- [ ] `AppGrid` + `AppCard` — icon, name, `StatusBadge` reflecting `is_active`/`session.active_app_id`.
- [ ] Click-to-activate wired to `sessionService.activateApp`; optimistic highlight, confirmed by `app:activated`.
- [ ] `PlaybackControls` (Next/Previous) wired to `sessionService.next/previous`; disabled while in-flight.
- [ ] Responsive grid + dark theme styling.

### Definition of Done
Opening the dashboard in two browser windows and clicking an App / pressing Next in one window instantly updates the highlighted state in the other, with no refresh.

---

## 8. Phase 7 — TV Client (Kiosk Rendering)

**Goal**: `/tv/:screenId` renders the correct slide for its position, adapts instantly to batch/app/screen changes, and looks TV-ready.

### Tasks
- [ ] `TVLayout` — fullscreen request, `cursor: none`, black background, no chrome.
- [ ] `TVPage` — resolves its own screen identity from the route param against the fetched `screens` list; computes its position index; derives assigned slide via `useSlideAssignment` (wrapping `utils/distribution.js`) or directly consumes the server-computed `assignment` from `GET /api/session/state`.
- [ ] `SlideRenderer` + registry-driven components: `ImageSlide`, `VideoSlide`, `TextSlide`, `PDFSlide`, `HTMLSlide`, `DefaultScreen`.
- [ ] Subscribe to all 5 socket events; on `batch:changed` patch state instantly; on `app:activated`/`content:updated`/`screen:updated` force a full resync via `GET /api/session/state`.
- [ ] Reconnect handling: brief unobtrusive "Reconnecting…" indicator; full resync on reconnect before trusting further pushes.
- [ ] Large-typography styling for `TextSlide`/`DefaultScreen` suited to distance viewing.

### Definition of Done
Reproduce the exact worked example from `02-system-architecture.md` §3 live: spin up 4 browser tabs at `/tv/1`–`/tv/4`, activate an App with 10 slides, confirm initial assignment, press Next twice from the dashboard, confirm TV3/TV4 fall back to Default Screen exactly as specified — all without any page refresh.

---

## 9. Phase 8 — Admin Panel

**Goal**: Every admin capability from `03-frontend-design.md` §8 and `06-api-design.md` is available and usable.

### Tasks
- [ ] `AdminLayout` — sidebar (Apps, Screens, Settings, Logout) + topbar.
- [ ] `LoginPage` wired to `POST /api/auth/login`.
- [ ] `AppsPage` — table/grid, create/rename/delete, icon upload via `FileUploader` → `/api/uploads` → `icon_url`.
- [ ] `AppSlidesPage` — per-App slide manager: create/edit/delete, type-aware `SlideForm` (upload for image/video/pdf, textarea for text/html), drag-and-drop `SlideList` wired to the reorder endpoint.
- [ ] `ScreensPage` — add/rename/remove screens, toggle active.
- [ ] `SettingsPage` — configure Default Screen type + content/upload.
- [ ] `ConfirmDialog` on all destructive actions; toasts/banners on success/error.

### Definition of Done
An admin can, without touching the database directly: create an App with an icon, add 10 slides of mixed types in a specific order via drag-and-drop, add/remove a screen, and set a Default Screen — with every change reflected live on already-open Dashboard/TV tabs.

---

## 10. Phase 9 — Integration Hardening & Edge Cases

**Goal**: Close the gaps that only show up when everything runs together.

### Tasks
- [ ] Verify **screen count changes mid-session**: add a 5th screen while an App is active and mid-batch; confirm re-ranking behaves as designed (no stale assignments, no crashes on any open TV tab).
- [ ] Verify **deleting the active App**: all TVs fall back to Default Screen; dashboard shows no App highlighted.
- [ ] Verify **deleting a slide currently on-air**: affected TV(s) receive `content:updated`, resync, and shift correctly.
- [ ] Verify **JWT expiry mid-session** in Admin panel: graceful redirect to login, no silent failures.
- [ ] Verify **socket reconnect after simulated network drop** (e.g. throttle/kill dev server briefly): TV resyncs fully rather than showing stale content indefinitely.
- [ ] Cross-check every response shape actually sent by the backend against `06-api-design.md` — fix drift either in code or in the doc (whichever is wrong).
- [ ] Basic load sanity check: 8–10 simulated TV connections + rapid Next/Previous clicks, confirm no event storms or race conditions on `session.current_batch`.

### Definition of Done
All edge cases above behave exactly as specified in the architecture docs, confirmed manually (or via lightweight integration tests) with no page refreshes required anywhere.

---

## 11. Phase 10 — Polish & Deployment

**Goal**: Production-ready build, deployed, documented for IT/office setup.

### Tasks
- [ ] Final UI pass: consistent spacing/typography/dark theme across Dashboard/Admin per `03-frontend-design.md` §10; TV mode visually verified on an actual TV/large display if possible.
- [ ] Environment configs finalized (`CORS_ORIGINS`, `JWT_EXPIRE_MINUTES`, production Supabase keys) per `04-backend-design.md` §10.
- [ ] Build & deploy backend (Uvicorn/Gunicorn ASGI, Socket.IO mounted) to chosen host.
- [ ] Build & deploy frontend static bundle (Vite build) to CDN/static hosting.
- [ ] Write a short **IT/kiosk setup note**: how to point each physical TV's browser permanently at `/tv/<screen_number>` and enable OS-level kiosk mode (since browsers restrict silent fullscreen without a user/OS gesture) — referenced from `02-system-architecture.md` §8.
- [ ] Smoke test the full flow in production: dashboard activate → TVs update → admin edits → TVs update — end to end, against the real deployed URLs.

### Definition of Done
The system is live at production URLs, at least one physical or simulated TV per intended screen is confirmed rendering correctly, and an admin unfamiliar with the codebase can follow the IT setup note to add a new physical screen unassisted.

---

## 12. Suggested Build Order (Summary)

```
Phase 0  Setup
   │
Phase 1  DB schema + models + seed
   │
Phase 2  Auth + CRUD APIs (Apps/Contents/Screens/Settings/Uploads)
   │
Phase 3  Distribution algorithm + Session APIs   ◄── highest-risk logic, test hardest here
   │
Phase 4  WebSocket broadcasting wired into every mutation
   │
Phase 5  Frontend foundation (routing, contexts, services, client distribution mirror)
   │
   ├── Phase 6  Public Dashboard
   ├── Phase 7  TV Client            ◄── prove the worked example live, in parallel with Phase 6
   └── Phase 8  Admin Panel
   │
Phase 9  Integration hardening & edge cases
   │
Phase 10 Polish & deployment
```

Phases 6, 7, and 8 can be parallelized across a small team once Phase 5 is complete, since they share infrastructure but touch mostly independent route trees and components. Phases 0–4 (backend + core algorithm) are strictly sequential and should not be skipped or reordered, since every later phase depends on their correctness — particularly Phase 3, which is the single piece of logic the entire product's value depends on.

## 13. Cross-References

- `01-product-overview.md` — business rules each phase must satisfy.
- `02-system-architecture.md` — the distribution algorithm and realtime event contract implemented in Phases 3–4.
- `03-frontend-design.md` — exact folder/component structure used in Phases 5–8.
- `04-backend-design.md` — exact folder/service structure used in Phases 1–4.
- `05-database-schema.md` — exact tables/columns/indexes created in Phase 1.
- `06-api-design.md` — exact endpoint contracts implemented in Phase 2–3 and consumed in Phases 5–8.
