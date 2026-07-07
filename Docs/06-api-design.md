# API Design — Digital Signage / Multi-Screen CMS

**Base URL**: `/api`
**Auth scheme**: `Authorization: Bearer <JWT>` on all admin (mutation) endpoints
**Content type**: `application/json` unless noted (uploads use `multipart/form-data`)
**Realtime**: Socket.IO, mounted at `/socket.io`

---

## 1. Authentication

### `POST /api/auth/login`
**Access**: Public
**Body**:
```json
{ "username": "admin", "password": "secret" }
```
**Response 200**:
```json
{ "access_token": "eyJhbGciOi...", "token_type": "bearer", "expires_in": 3600 }
```
**Response 401**: invalid credentials.

---

## 2. Apps

### `GET /api/apps`
**Access**: Public
Returns all Apps for the dashboard.
```json
[
  { "id": 1, "name": "WebPT", "icon_url": "...", "is_active": false },
  { "id": 2, "name": "Training", "icon_url": "...", "is_active": true }
]
```

### `POST /api/apps`
**Access**: Admin
```json
{ "name": "Marketing", "icon_url": "https://.../icon.png" }
```
→ `201` created App object.

### `PUT /api/apps/{app_id}`
**Access**: Admin — rename / update icon.
```json
{ "name": "New Name", "icon_url": "https://.../new-icon.png" }
```

### `DELETE /api/apps/{app_id}`
**Access**: Admin — cascades delete of its `contents`. If it was the active App, `session.active_app_id` is set to `null`.

### `POST /api/apps/{app_id}/activate`
**Access**: Public *(dashboard action — no login required per requirements)*
Sets this App as globally active, resets `current_batch` to 0.
**Response 200**:
```json
{ "active_app_id": 2, "current_batch": 0 }
```
**Side effect**: emits `app:activated` WebSocket event to all clients.

---

## 3. Contents (Slides)

### `GET /api/apps/{app_id}/contents`
**Access**: Public (needed by TV clients to know the full slide list)
Returns ordered slides.
```json
[
  { "id": 11, "app_id": 2, "title": "Slide 1", "type": "image", "file_url": "...", "text_content": null, "display_order": 0, "duration": 10 },
  { "id": 12, "app_id": 2, "title": "Slide 2", "type": "video", "file_url": "...", "text_content": null, "display_order": 1, "duration": null }
]
```

### `POST /api/apps/{app_id}/contents`
**Access**: Admin
```json
{
  "title": "Slide 3",
  "type": "text",
  "text_content": "Welcome to the office!",
  "duration": 8
}
```
`display_order` is auto-assigned as `max(existing) + 1` unless explicitly provided.
→ `201` created slide. Emits `content:updated`.

### `PUT /api/contents/{content_id}`
**Access**: Admin — edit any field (title, type, file_url, text_content, duration).
Emits `content:updated`.

### `DELETE /api/contents/{content_id}`
**Access**: Admin. Emits `content:updated`.

### `PATCH /api/apps/{app_id}/contents/reorder`
**Access**: Admin — bulk reorder after drag-and-drop.
```json
{ "ordered_ids": [13, 11, 12] }
```
Rewrites `display_order` sequentially. Emits `content:updated`.

---

## 4. Screens

### `GET /api/screens`
**Access**: Public (TV clients need this to determine their rank/position)
Returns all screens ordered by `screen_number`.
```json
[
  { "id": 1, "screen_number": 1, "screen_name": "Lobby", "is_active": true },
  { "id": 2, "screen_number": 2, "screen_name": "Break Room", "is_active": true }
]
```

### `POST /api/screens`
**Access**: Admin
```json
{ "screen_number": 5, "screen_name": "Kitchen" }
```
→ `201` created. Emits `screen:updated`.

### `PUT /api/screens/{screen_id}`
**Access**: Admin — rename, reassign number, toggle `is_active`.
Emits `screen:updated`.

### `DELETE /api/screens/{screen_id}`
**Access**: Admin. Emits `screen:updated`.

---

## 5. Session (Global Playback State)

### `GET /api/session/state`
**Access**: Public — the primary bootstrap call for both Dashboard and TV clients.
**Response 200**:
```json
{
  "active_app_id": 2,
  "current_batch": 1,
  "screens": [
    { "id": 1, "screen_number": 1, "screen_name": "Lobby" },
    { "id": 2, "screen_number": 2, "screen_name": "Break Room" },
    { "id": 3, "screen_number": 3, "screen_name": "Hallway" },
    { "id": 4, "screen_number": 4, "screen_name": "Reception" }
  ],
  "assignment": {
    "1": { "content_id": 15, "type": "image", "file_url": "..." },
    "2": { "content_id": 16, "type": "video", "file_url": "..." },
    "3": { "content_id": 17, "type": "text", "text_content": "..." },
    "4": null
  }
}
```
- `assignment` keys are `screen.id`, values are the computed slide for that screen at the current batch (server-computed via `distribution_service.compute_assignment`), or `null` if out of range — clients render the configured Default Screen for `null` entries (fetched separately via `GET /api/settings` or embedded, see below).
- This single endpoint is sufficient for a TV to render immediately on load without any client-side recomputation, though the client *also* has the pure function locally to instantly react to lightweight socket payloads (e.g. just `{ current_batch: 2 }`) without waiting for a full round trip.

### `POST /api/session/next`
**Access**: Public (dashboard control)
Increments `current_batch`. Returns the same shape as `GET /api/session/state`. Emits `batch:changed`.

### `POST /api/session/previous`
**Access**: Public
Decrements `current_batch` (floor 0). Same response shape. Emits `batch:changed`.

---

## 6. Settings (Default Screen)

### `GET /api/settings`
**Access**: Public (TV clients use this whenever `assignment[screenId]` is `null`)
```json
{
  "default_screen_type": "image",
  "default_screen_url": "https://.../default.jpg",
  "default_screen_text": null
}
```

### `PUT /api/settings`
**Access**: Admin
```json
{ "default_screen_type": "html", "default_screen_text": "<h1>No content scheduled</h1>" }
```
Emits `settings:updated`.

---

## 7. File Upload

### `POST /api/uploads`
**Access**: Admin
**Body** (`multipart/form-data`): `file`, `bucket` (`app-icons` | `slide-media` | `default-screen`)
**Response 200**:
```json
{ "url": "https://<supabase-project>.supabase.co/storage/v1/object/public/slide-media/abc123.mp4" }
```
The returned `url` is then submitted as `icon_url` / `file_url` / `default_screen_url` on the relevant create/update call. The database never receives raw file bytes.

---

## 8. WebSocket Events (Socket.IO)

**Namespace/Room**: default namespace, single `signage` room (all clients join on connect).

| Event (server → client) | Payload | Trigger |
|---|---|---|
| `app:activated` | `{ active_app_id, current_batch }` | `POST /api/apps/{id}/activate` |
| `batch:changed` | `{ current_batch }` | `POST /api/session/next` \| `/previous` |
| `content:updated` | `{ app_id }` | Any create/update/delete/reorder under `/api/apps/{id}/contents` |
| `screen:updated` | `{}` | Any create/update/delete under `/api/screens` |
| `settings:updated` | `{ default_screen_type, default_screen_url, default_screen_text }` | `PUT /api/settings` |

**Client behavior contract**: on any event, the client either (a) uses the payload directly to patch local state and recompute via the shared `distribution.js` pure function, or (b) for safety/simplicity, re-calls `GET /api/session/state` to resync fully. Recommended: (a) for `batch:changed` (cheap, frequent), (b) for `app:activated`/`content:updated`/`screen:updated` (rarer, larger state shifts, worth a full resync).

**Client → server**: no client-emitted events are required for v1 (all mutations go through REST; sockets are broadcast-only). This keeps the WebSocket surface minimal and avoids duplicating auth/validation logic outside the REST layer.

---

## 9. Status Codes & Conventions

| Code | Meaning |
|---|---|
| `200` | Success (GET, and mutations that return the updated resource state) |
| `201` | Resource created (POST creating a new App/Content/Screen) |
| `204` | Success, no body (some DELETEs, at implementer's discretion — this spec uses `200` with the deleted id echoed back for simplicity, either is acceptable) |
| `400` | Validation error (Pydantic schema failure) — body includes field-level detail |
| `401` | Missing/invalid/expired JWT on a protected route |
| `404` | Resource not found (e.g. unknown `app_id`, `content_id`, `screen_id`) |
| `409` | Conflict (e.g. duplicate `screen_number` on create) |
| `500` | Unhandled server error (generic body, no stack trace leaked) |

All error responses share a consistent shape:
```json
{ "detail": "Human-readable message", "code": "SCREEN_NUMBER_TAKEN" }
```

## 10. Endpoint Access Summary

| Endpoint group | Public | Admin (JWT) |
|---|---|---|
| `GET /api/apps`, `/api/apps/{id}/contents`, `/api/screens`, `/api/session/*` (GET/next/previous), `/api/settings` (GET), `/api/apps/{id}/activate` | ✅ | — |
| All `POST/PUT/PATCH/DELETE` on Apps, Contents, Screens, Settings, and `/api/uploads` | ❌ | ✅ |
| `/api/auth/login` | ✅ (it *is* the login) | — |

This split precisely matches the requirement that the Dashboard and TV experience require no authentication, while all content-management and structural changes are admin-only.
