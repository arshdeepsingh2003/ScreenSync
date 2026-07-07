# Database Schema — Digital Signage / Multi-Screen CMS

**Database**: Supabase PostgreSQL
**Storage**: Supabase Storage (buckets referenced by URL only — no binary data in Postgres)

## 1. Entity Relationship Overview

```
admins (standalone — auth only)

apps (1) ───< contents (many)
                      │
                      │ type-discriminated content (image/video/pdf/text/html)
                      ▼
                 [file_url | text_content]

screens (standalone list, ordered by screen_number)

session (singleton row) ──> active_app_id (FK to apps)

settings (singleton row) ── default screen configuration
```

There is no direct FK between `screens` and `contents`/`apps` — the mapping between a screen and its current slide is **computed at runtime** by the distribution algorithm (batch × screen position), not stored. This is intentional: storing a `current_slide_id` per screen would require it to be rewritten on every Next/Previous across every screen row; instead only the singleton `session.current_batch` changes, and every screen derives its own slide from that plus its rank among active screens.

## 2. Table Definitions

### 2.1 `admins`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` / `serial` | Primary Key |
| `username` | `varchar(100)` | Unique, Not Null |
| `password_hash` | `varchar(255)` | Not Null (bcrypt hash) |
| `created_at` | `timestamptz` | Default `now()` |

- Passwords are never stored in plaintext. `password_hash` is the bcrypt digest only.

### 2.2 `apps`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` / `serial` | Primary Key |
| `name` | `varchar(150)` | Not Null |
| `icon_url` | `text` | Nullable (points to Supabase Storage object) |
| `is_active` | `boolean` | Default `false` — denormalized convenience flag, kept in sync with `session.active_app_id` |
| `created_at` | `timestamptz` | Default `now()` |

- Only one row across the table should have `is_active = true` at any time (enforced at the service layer; optionally reinforced by a partial unique index: `CREATE UNIQUE INDEX one_active_app ON apps (is_active) WHERE is_active = true;`).

### 2.3 `contents`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` / `serial` | Primary Key |
| `app_id` | `uuid` / `int` | Foreign Key → `apps.id`, Not Null, `ON DELETE CASCADE` |
| `title` | `varchar(200)` | Nullable |
| `type` | `varchar(20)` | Not Null — one of `image`, `video`, `pdf`, `text`, `html` (extensible; see note) |
| `file_url` | `text` | Nullable — populated for `image`/`video`/`pdf` types |
| `text_content` | `text` | Nullable — populated for `text`/`html` types |
| `display_order` | `integer` | Not Null, Default `0` — determines slide sequence within the App |
| `duration` | `integer` | Nullable — seconds to display, used for auto-pacing where applicable |
| `created_at` | `timestamptz` | Default `now()` |

- **Extensibility note**: `type` is a plain string column, not a hard Postgres `ENUM`, specifically so new content types (e.g. `weather`, `rss`, `iframe`) can be introduced by the application layer without a schema migration. Validity is enforced in the Pydantic schema / frontend registry, not the database type system.
- Index: `CREATE INDEX idx_contents_app_order ON contents (app_id, display_order);` — supports the primary read pattern (ordered slides per App).

### 2.4 `screens`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` / `serial` | Primary Key |
| `screen_number` | `integer` | Unique, Not Null — used in the `/tv/:screenId` route and as the ordering key |
| `screen_name` | `varchar(100)` | Nullable — human-friendly label (e.g. "Lobby TV") |
| `is_active` | `boolean` | Default `true` — inactive screens are excluded from the distribution calculation entirely |
| `created_at` | `timestamptz` | Default `now()` |

- Index: `CREATE INDEX idx_screens_active_number ON screens (is_active, screen_number);` — supports fetching "active screens ordered by number", the exact query the distribution algorithm needs.
- Adding/removing/renaming rows here is the entire mechanism by which "number of TVs is not fixed" is satisfied — no other table needs to change.

### 2.5 `session` (singleton table)

| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | Primary Key — always `1` (singleton pattern) |
| `active_app_id` | `uuid` / `int` | Foreign Key → `apps.id`, Nullable |
| `current_batch` | `integer` | Not Null, Default `0` |
| `updated_at` | `timestamptz` | Default `now()`, updated on every write |

- Enforced as a singleton either by application convention (always upsert `id = 1`) or a `CHECK (id = 1)` constraint plus seeding exactly one row at migration time.
- This is the single hottest table in the system — read on every TV load, written on every Next/Previous/Activate action.

### 2.6 `settings` (singleton table)

| Column | Type | Constraints |
|---|---|---|
| `id` | `integer` | Primary Key — always `1` |
| `default_screen_type` | `varchar(20)` | Not Null — one of `image`, `video`, `html`, `text` |
| `default_screen_url` | `text` | Nullable — used when type is `image`/`video` (or an html file reference) |
| `default_screen_text` | `text` | Nullable — used when type is `text`/`html` inline content (added alongside `default_screen_url` for symmetry with `contents.text_content`) |
| `updated_at` | `timestamptz` | Default `now()` |

> Note: the original requirements listed `default_screen_type` and `default_screen_url` only; `default_screen_text` is added here as a natural extension mirroring the `contents` table's `file_url` / `text_content` split, so text/HTML default screens don't need to be stored as pseudo-files. This keeps the Default Screen fully symmetric with regular Slides in how content is represented.

## 3. Relationships Summary

| Relationship | Type | Notes |
|---|---|---|
| `apps` → `contents` | One-to-Many | `contents.app_id` FK, cascade delete |
| `apps` → `session` | One-to-One (referential) | `session.active_app_id` FK, nullable (no app active initially) |
| `screens` | Standalone | No FK to apps/contents; joined only computationally via the distribution algorithm |
| `admins` | Standalone | Used only by auth flow |
| `settings` | Standalone singleton | Referenced by TV clients whenever a computed slide is `null` |

## 4. Sample Rows (Illustrative)

**apps**
```
id | name       | icon_url                | is_active
1  | WebPT      | .../icons/webpt.png      | false
2  | Training   | .../icons/training.png   | true
3  | Welcome    | .../icons/welcome.png    | false
```

**contents** (for Training, app_id = 2)
```
id | app_id | title     | type  | file_url              | display_order | duration
11 | 2      | Slide 1   | image | .../slides/s1.jpg      | 0             | 10
12 | 2      | Slide 2   | video | .../slides/s2.mp4      | 1             | null
13 | 2      | Slide 3   | text  | null                   | 2             | 8
```
(`text_content` populated for row 13, omitted from table for brevity.)

**screens**
```
id | screen_number | screen_name | is_active
1  | 1              | Lobby       | true
2  | 2              | Break Room  | true
3  | 3              | Hallway     | true
4  | 4              | Reception   | true
```

**session**
```
id | active_app_id | current_batch
1  | 2              | 1
```

Given the above (4 active screens, batch = 1), `startIndex = 1 * 4 = 4` → screens map to slide indices 4, 5, 6, 7 within Training's slide list (0-indexed), falling back to `settings` default screen for any index ≥ the total slide count.

## 5. Migration & Seeding Notes

- Seed exactly one `session` row (`id=1`, `active_app_id=null`, `current_batch=0`) and one `settings` row (`id=1`, sensible default type/content) at initial migration time, since both are singleton tables the application assumes always exist.
- Foreign keys use `ON DELETE CASCADE` from `contents.app_id` → `apps.id` so deleting an App cleanly removes its slides; `session.active_app_id` should instead be `ON DELETE SET NULL` so deleting the currently active App doesn't fail — it simply deactivates playback (all screens fall back to Default Screen) until a new App is activated.
- Recommended indexes are listed inline above; all are supporting the two hottest read patterns: "ordered slides for an App" and "ordered active screens."
