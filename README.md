# ScreenSync 📺

ScreenSync is a real-time digital signage content management system (CMS) designed to broadcast media playlists, slides, and fallback screens across multiple physical TV displays or kiosk clients. 

Using **WebSockets**, ScreenSync propagates active apps, playlist batches, and slide changes to connected TVs instantly without client page reloads.

---

## 🏗️ System Architecture

- **Frontend**: Single Page Application built with **React (Vite)**, **Tailwind CSS**, and **Socket.io-client**.
- **Backend**: High-performance asynchronous REST API built with **FastAPI**, **SQLAlchemy (PostgreSQL)**, and **Python-SocketIO**.
- **Storage / Database**: Hosted **PostgreSQL (Supabase)** for metadata/state storage and **Supabase Storage Buckets** for static media uploads (images, videos, PDFs, and icons).

---

## 🛠️ Prerequisites

Make sure you have the following installed on your laptop:
1. **Python 3.10+** (Python 3.12 recommended)
2. **Node.js v18+** (with `npm`)
3. **Supabase Account** (or a local PostgreSQL instance and compatibility storage)

---

## 🚀 Setup & Installation

Follow these steps to clone and run the project locally on your laptop.

### 1. Database & Storage Setup (Supabase)
Create a new project on [Supabase](https://supabase.com) and configure the following:

#### A. Storage Buckets
Go to **Storage** in your Supabase dashboard and create three **Public** buckets:
1. `app-icons` (For playlist app thumbnail icons)
2. `slide-media` (For slide images, videos, and PDFs)
3. `default-screen` (For default fallback images and videos)

#### B. Connection Strings
Retrieve your **PostgreSQL Transaction connection string** (pooling port `6543`) from Project Settings -> Database.

---

### 2. Backend Setup
Open a terminal in the root project directory:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create a virtual environment
python -m venv venv

# 3. Activate the virtual environment
# On Windows (Command Prompt/PowerShell):
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 4. Install required packages
pip install -r requirements.txt

# 5. Setup your environment variables
cp .env.example .env
```

Open `backend/.env` and populate it with your credentials:
```env
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:6543/postgres
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_KEY=[your-supabase-service-role-secret-key]
JWT_SECRET=generate-a-secure-secret-key-here
JWT_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ADMIN_USERNAME=admin
ADMIN_PASSWORD=AdminPassword123
```

#### Seed the Database
Before starting the server, you need to seed the database. This initializes the global session and settings state singleton rows, and creates the bootstrap admin user using credentials defined in your `.env`:

```bash
python db/seed.py
```

#### Start the Backend Server
```bash
# Start FastAPI application
python main.py
# Or run with uvicorn directly:
uvicorn main:app --reload
```
The backend server will run on [http://localhost:8000](http://localhost:8000) and automatically run table structure migrations on startup.

---

### 3. Frontend Setup
Open a new terminal window in the root project directory:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
```

Make sure `frontend/.env` points to your backend instance:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=http://localhost:8000
```

#### Start Development Server
```bash
npm run dev
```
The frontend dev server will launch on [http://localhost:5173](http://localhost:5173).

---

## 💻 How to Use ScreenSync

### 1. Signage Session Dashboard (Public Screen)
Go to [http://localhost:5173](http://localhost:5173) to see the dashboard. Here you can:
- View all available Playlists.
- Activate playlists.
- Click **Next** or **Previous** to batch-page content through active TV displays.
- Monitor active screen connection statuses (Online/Offline).

### 2. TV Client Viewport (Kiosk Mode)
Open [http://localhost:5173/tv/1](http://localhost:5173/tv/1) (where `1` is the registered screen number).
- If a playlist is active and this screen is assigned a slide, the TV client renders it fullscreen.
- If there is no active playlist, or no slide matches this display index, it displays the **Default Fallback Screen** (Image, Video, Custom HTML, or Text message) configured in Admin Settings.

### 3. CMS Admin Control Panel (Protected Area)
Go to [http://localhost:5173/admin/login](http://localhost:5173/admin/login).
- Log in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` credentials from your `backend/.env` file.
- **Overview**: See overview stats.
- **Apps & Slides**: Register playlists and upload slides with drag-and-drop media uploading.
- **Screens**: Register, activate/deactivate, or delete screens.
- **Settings**: Configure Fallback Views globally or customize specifically per Project (App), complete with a live TV mockup preview before saving.

---

## 🧪 Running Tests

To verify backend integrations and API schemas, run the test script:

```bash
cd backend
python tests/test_phase2.py
```

---

## 📖 Additional Documentation

For deep architectural details and system flow specifications, refer to the documents in the [Docs](file:///c:/Users/Arshdeep/Desktop/ScreenSync/Docs) directory:
- [Product Overview](file:///c:/Users/Arshdeep/Desktop/ScreenSync/Docs/01-product-overview.md)
- [System Architecture](file:///c:/Users/Arshdeep/Desktop/ScreenSync/Docs/02-system-architecture.md)
- [Frontend Design](file:///c:/Users/Arshdeep/Desktop/ScreenSync/Docs/03-frontend-design.md)
- [Backend Design](file:///c:/Users/Arshdeep/Desktop/ScreenSync/Docs/04-backend-design.md)
- [Database Schema](file:///c:/Users/Arshdeep/Desktop/ScreenSync/Docs/05-database-schema.md)
- [API Design Specification](file:///c:/Users/Arshdeep/Desktop/ScreenSync/Docs/06-api-design.md)
