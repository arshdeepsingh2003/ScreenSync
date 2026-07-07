# Frontend Design — Digital Signage / Multi-Screen CMS

## 1. Tech Stack

- **React (Vite)** — SPA build tooling
- **Tailwind CSS** — utility-first styling, dark theme
- **React Router** — route separation for Dashboard / TV / Admin
- **Axios** — REST API client
- **Socket.IO Client** — realtime updates

## 2. Route Map

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Dashboard — App cards, Next/Previous |
| `/tv/:screenId` | Public (kiosk) | TV playback view |
| `/admin/login` | Public | Admin login form |
| `/admin` | Protected | Admin overview |
| `/admin/apps` | Protected | App CRUD |
| `/admin/apps/:appId/slides` | Protected | Slide CRUD + reordering for one App |
| `/admin/screens` | Protected | Screen management |
| `/admin/settings` | Protected | Default Screen configuration |

`/admin/*` routes are wrapped in a `<RequireAuth>` guard that checks a valid JWT (from context/localStorage) and redirects to `/admin/login` otherwise.

## 3. Folder Structure

```
src/
├── main.jsx
├── App.jsx                        # Router setup, route groups
├── index.css                      # Tailwind base + dark theme tokens
│
├── layouts/
│   ├── DashboardLayout.jsx        # Nav-less, card grid shell
│   ├── AdminLayout.jsx            # Sidebar + topbar CMS shell
│   └── TVLayout.jsx               # Fullscreen, no-chrome shell
│
├── pages/
│   ├── dashboard/
│   │   └── DashboardPage.jsx
│   ├── tv/
│   │   └── TVPage.jsx
│   └── admin/
│       ├── LoginPage.jsx
│       ├── OverviewPage.jsx
│       ├── AppsPage.jsx
│       ├── AppSlidesPage.jsx
│       ├── ScreensPage.jsx
│       └── SettingsPage.jsx
│
├── components/
│   ├── dashboard/
│   │   ├── AppCard.jsx
│   │   ├── AppGrid.jsx
│   │   └── PlaybackControls.jsx   # Next / Previous buttons
│   │
│   ├── tv/
│   │   ├── SlideRenderer.jsx      # Content-type dispatcher (registry pattern)
│   │   ├── slides/
│   │   │   ├── ImageSlide.jsx
│   │   │   ├── VideoSlide.jsx
│   │   │   ├── TextSlide.jsx
│   │   │   ├── PDFSlide.jsx
│   │   │   └── HTMLSlide.jsx
│   │   └── DefaultScreen.jsx
│   │
│   ├── admin/
│   │   ├── AppForm.jsx
│   │   ├── AppTable.jsx
│   │   ├── SlideForm.jsx
│   │   ├── SlideList.jsx          # drag-and-drop reorder
│   │   ├── ScreenForm.jsx
│   │   ├── ScreenTable.jsx
│   │   ├── DefaultScreenForm.jsx
│   │   └── FileUploader.jsx
│   │
│   └── common/
│       ├── Button.jsx
│       ├── Modal.jsx
│       ├── Spinner.jsx
│       ├── StatusBadge.jsx
│       └── ConfirmDialog.jsx
│
├── contexts/
│   ├── AuthContext.jsx             # JWT, admin user, login/logout
│   ├── SessionContext.jsx          # activeAppId, currentBatch (dashboard+admin)
│   └── SocketContext.jsx           # single shared socket.io connection
│
├── hooks/
│   ├── useAuth.js
│   ├── useSocket.js
│   ├── useSession.js                # subscribes to session state + mutations
│   ├── useScreens.js
│   ├── useApps.js
│   ├── useAppSlides.js
│   └── useSlideAssignment.js        # the distribution algorithm, client-side mirror
│
├── services/
│   ├── api.js                       # axios instance, interceptors (JWT header, error handling)
│   ├── authService.js
│   ├── appService.js
│   ├── contentService.js
│   ├── screenService.js
│   ├── sessionService.js
│   ├── settingsService.js
│   └── socketService.js
│
└── utils/
    ├── distribution.js              # pure function: computeSlideForScreen(...)
    ├── contentTypeRegistry.js       # maps type string -> component
    ├── formatters.js
    └── constants.js
```

## 4. State Management Approach

No heavy global state library is required — **React Context + hooks** is sufficient given the scope:

- **`AuthContext`** — holds JWT + admin profile; persists token to `localStorage`; exposes `login()`, `logout()`, `isAuthenticated`.
- **`SocketContext`** — instantiates a single Socket.IO client on mount, exposes it via context so any component can `useSocket()` and subscribe/unsubscribe to events without creating duplicate connections.
- **`SessionContext`** — wraps `activeApp`, `currentBatch`, `screens`, `slides` and keeps them in sync by (a) initial REST fetch, (b) socket event handlers that patch state in place. Used by both Dashboard (for highlighting active App / driving Next-Previous) and TV pages (for computing assignment).
- Local component state (`useState`) for forms, modals, and non-shared UI state in the Admin panel.

## 5. The Content-Type Rendering Pattern (Extensibility Core)

`utils/contentTypeRegistry.js`:

```js
import ImageSlide from '../components/tv/slides/ImageSlide';
import VideoSlide from '../components/tv/slides/VideoSlide';
import TextSlide from '../components/tv/slides/TextSlide';
import PDFSlide from '../components/tv/slides/PDFSlide';
import HTMLSlide from '../components/tv/slides/HTMLSlide';

export const CONTENT_TYPE_REGISTRY = {
  image: ImageSlide,
  video: VideoSlide,
  text: TextSlide,
  pdf: PDFSlide,
  html: HTMLSlide,
  // future: weather: WeatherSlide, rss: RSSSlide, iframe: IframeSlide
};
```

`components/tv/SlideRenderer.jsx` looks up `CONTENT_TYPE_REGISTRY[slide.type]` and renders it, falling back to `DefaultScreen` if the type is unknown or `slide` is null. **Adding a new content type never touches the distribution logic or routing — only this registry and one new component.**

## 6. TV Mode Behavior (`TVLayout` + `TVPage`)

- On mount: request Fullscreen API (`element.requestFullscreen()`), triggered by a one-time user/OS gesture at kiosk boot, or via an OS-level kiosk browser flag (documented for IT setup since browsers restrict silent fullscreen).
- CSS: `cursor: none`, `background: #000`, no scrollbars, `overflow: hidden`, 100vw/100vh root.
- No navigation chrome, no buttons — purely a rendering surface.
- Subscribes via `useSession()` + `useScreens()` + socket events; recomputes assigned slide with `utils/distribution.js` on every relevant change; **no `window.location.reload()` anywhere** — all updates are in-place React re-renders.
- Large, readable typography defaults for `TextSlide`/`DefaultScreen` (e.g. `text-6xl`+ Tailwind scale) since TVs are viewed from a distance.
- Optional per-slide `duration` (from `contents.duration`) can auto-advance within a still-image/text slide context if desired — video/PDF slides typically drive their own pacing; this is a controlled, additive behavior on top of the core Next/Previous-driven batch model.

## 7. Dashboard UX

- `AppGrid` renders `AppCard` per App: icon (from `icon_url`), name, `StatusBadge` (Active/Inactive derived from `apps.is_active` / matching `session.active_app_id`).
- Clicking a card calls `sessionService.activateApp(appId)` → optimistic UI highlight → confirmed by `app:activated` socket event.
- `PlaybackControls` (Next/Previous) call `sessionService.next()` / `sessionService.previous()`; disabled state while a request is in-flight to prevent double-fires.
- Fully responsive grid (Tailwind `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`), dark theme (`bg-slate-900`/`bg-slate-800` cards, accent color for active state, e.g. glowing border or accent background).

## 8. Admin Panel UX

- `AdminLayout`: sidebar navigation (Apps, Screens, Settings, Logout) + topbar with admin username.
- `AppsPage`: table/grid of Apps with create/rename/delete/upload-icon actions (modal-based forms using `AppForm`).
- `AppSlidesPage`: per-App slide manager — `SlideList` supports drag-and-drop reordering (writes new `display_order` values via a batch reorder endpoint), `SlideForm` adapts its fields based on selected `type` (file uploader for image/video/pdf, rich text/textarea for text, code editor/textarea for html).
- `ScreensPage`: `ScreenTable` lists screens with number/name/active toggle; `ScreenForm` for add/rename; remove with `ConfirmDialog`.
- `SettingsPage`: `DefaultScreenForm` — choose type (image/video/html/text) + corresponding content/upload.
- All destructive actions (delete App, delete Slide, remove Screen) go through `ConfirmDialog`.
- Toasts/inline banners for success/error feedback on all mutations.

## 9. Error Handling & Resilience

- `services/api.js` axios instance has a response interceptor: on `401` → clear auth, redirect to `/admin/login`; on network error → surface a retry-friendly toast.
- `SocketContext` handles `connect`, `disconnect`, `reconnect` events; on `reconnect`, forces a fresh REST re-fetch of session/screens/slides before resuming socket-driven updates (avoids stale state after downtime).
- TV pages render a lightweight "Reconnecting..." indicator (small, unobtrusive, corner placement) only if disconnected beyond a short grace period — never blocks content that's already loaded.

## 10. Styling System

- Tailwind config extends a dark palette (`slate`/`zinc` neutrals + one accent, e.g. `indigo` or `emerald`) shared by Dashboard and Admin.
- TV mode uses pure black background regardless of theme, to avoid backlight bleed on displays and to make content pop.
- Consistent spacing/typography scale defined once in `tailwind.config.js`; reused across `common/` components for visual consistency between Dashboard and Admin (Admin = CMS-professional, Dashboard = big-card office-friendly).
