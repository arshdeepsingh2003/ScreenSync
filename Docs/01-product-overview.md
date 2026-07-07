# Product Overview — Digital Signage / Multi-Screen Content Management System

## 1. Purpose

An enterprise-grade Digital Signage CMS designed to run inside an office environment, driving content across a **variable number of TV screens** from a single, centrally managed source of truth. The system lets non-technical office staff activate "Apps" (content channels such as WebPT, Training, Welcome, Marketing, Safety, HR) from a public dashboard, while administrators manage all content, screens, and configuration through a secured admin panel.

The defining technical challenge this product solves is **dynamic content distribution**: given N slides in an active App and S physical screens (S is not fixed and can change at any time), the system must deterministically decide what each screen shows, advance/rewind that assignment in lockstep across all screens, and gracefully fall back to a Default Screen when content runs out — all in real time, with no page refresh.

## 2. Target Users

| User Type | Access | Capabilities |
|---|---|---|
| **Office Staff / Front Desk / Anyone** | Public, no login | View Apps, activate an App, press Next/Previous |
| **TV / Screen Device** | Public, no login (kiosk mode) | Passively renders assigned slide content, listens for realtime updates |
| **Administrator** | Authenticated (JWT) | Full CRUD on Apps, Content/Slides, Screens, Default Screen settings |

## 3. Core Concepts & Glossary

| Term | Definition |
|---|---|
| **App** | A named content channel (e.g. "Training"). Contains an ordered list of Slides. Only one App is "active" globally at a time. |
| **Slide / Content Item** | A single unit of content belonging to an App — Image, Video, PDF, Text, or HTML. Has a `display_order` and optional `duration`. |
| **Screen** | A physical TV, identified by a `screen_number` and reachable at `/tv/:screenId`. Screens are managed (added/removed/renamed) by the admin and their count is never hard-coded. |
| **Batch** | A "page" of slides. Batch size = number of active screens. `startIndex = batch * numberOfScreens`. |
| **Session** | The single global state record: which App is active, and the current batch index. Drives what every screen renders. |
| **Default Screen** | Configurable fallback (image/video/html/text) shown on any screen whose calculated slide index doesn't exist. |

## 4. Primary User Flows

### 4.1 Public Dashboard Flow
1. User opens the dashboard (root route, no auth).
2. Sees all Apps as cards: icon, name, active/inactive status.
3. Clicks an App → it becomes the **globally active App** (only one active at a time); the previously active App is deactivated.
4. Dashboard exposes **Next** / **Previous** controls that move the global `current_batch` forward/back.
5. Every TV screen, wherever it is, reacts instantly via WebSocket — no refresh, no polling delay.

### 4.2 TV Playback Flow
1. A TV browser is pointed permanently at `/tv/:screenId` (e.g. `/tv/1`, `/tv/2`, ... `/tv/N`).
2. On load, the TV app fetches current session state (active App + current batch) and the full list of screens (to know its own index among active screens).
3. It computes `slideIndex = (batch * screenCount) + screenPositionIndex`.
4. If a slide exists at that index in the active App's slide list → render it using the correct type-specific component.
5. If not → render the configured Default Screen.
6. The TV subscribes to WebSocket events and re-renders immediately on any relevant change (App activated, Next/Previous pressed, slide content edited, screen added/removed).
7. TV view is chrome-less: fullscreen, no cursor, no navigation, black background, kiosk-optimized.

### 4.3 Admin Flow
1. Admin logs in at `/admin/login` (JWT + bcrypt-hashed password).
2. Manages Apps (create/rename/delete/upload icon).
3. Manages Slides per App (create/edit/delete/reorder, upload image/video/PDF, or author text/HTML).
4. Manages Screens (add/remove/rename/assign screen number) — the distribution logic automatically adapts to however many screens exist at that moment.
5. Configures the Default Screen (type + content).
6. All admin mutations that affect what's on-air (content edits, screen count changes) broadcast a WebSocket event so live TVs update immediately.

## 5. Key Business Rules

1. **Exactly one App active at a time**, globally, across all screens.
2. **Screen count is dynamic.** Nothing in the distribution algorithm may assume a fixed number of screens. Adding/removing a screen immediately changes batch size for the *next* Next/Previous action.
3. **Batching formula** (see System Architecture doc for full detail):
   - `startIndex = currentBatch * numberOfActiveScreens`
   - `slideIndexForScreen(i) = startIndex + i` (i = screen's 0-based position among active screens, ordered by `screen_number`)
   - If `slideIndexForScreen(i) >= totalSlides` → show Default Screen.
4. **Next/Previous are global**, not per-screen. Pressing Next advances `current_batch` by 1 for the whole system; Previous decrements it (floor at 0).
5. **Realtime consistency**: all screens must reflect the same App + batch at (practically) the same instant.
6. **Content types are extensible** — the system must support adding new slide types (e.g., "Weather", "RSS", "Iframe Dashboard") without structural rework, via a type-driven component registry on the frontend and an open `type` string column on the backend.
7. **Public read/interact, admin-only write**: dashboard and TV routes require no authentication; all mutation endpoints require a valid JWT belonging to an admin.

## 6. Non-Functional Requirements

- **Scalability**: must handle 2–10+ screens without code changes; content distribution is purely computed, not hard-coded per screen count.
- **Real-time**: sub-second propagation of state changes to all connected TVs via WebSockets (Socket.IO).
- **Resilience**: TVs that reconnect after a network blip must re-sync to current state (fetch-then-subscribe pattern, not push-only).
- **Media hosting**: all uploaded media lives in Supabase Storage; the database stores only URLs, never binary blobs.
- **Security**: admin routes protected by JWT; passwords hashed with bcrypt; public endpoints strictly read/interact only, no data leakage of admin credentials or internal IDs beyond what's needed to render.
- **Maintainability**: modular frontend (components/pages/layouts/hooks/services/contexts/utils) and backend (routers/models/schemas/services/db/storage/auth/websocket) so new content types, new admin features, or new screen behaviors can be added in isolation.
- **UX**: modern dark-themed, responsive UI for dashboard/admin; large-typography, high-contrast, distraction-free UI for TV mode.

## 7. Out of Scope (v1)

- Multi-tenant / multi-office support (single office deployment assumed).
- Per-screen independent App selection (all screens follow the one global active App by design).
- Scheduling/calendar-based App activation (could be a future extension).
- Analytics/viewership reporting (could be a future extension via the `contents`/`session` history).

## 8. Related Documents

- `02-system-architecture.md` — High-level architecture, data flow, realtime design, distribution algorithm.
- `03-frontend-design.md` — React app structure, routing, state, component registry for slide types.
- `04-backend-design.md` — FastAPI service structure, auth, websocket, storage integration.
- `05-database-schema.md` — Full Supabase PostgreSQL schema, relationships, indexes.
- `06-api-design.md` — REST + WebSocket API contract.
