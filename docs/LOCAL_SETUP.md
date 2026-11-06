# Local Development Setup Guide

This guide walks you through setting up and running **Tiny Notes** on your local workstation.

---

## 1. Prerequisites

Ensure your system meets the following software requirements:

- **Node.js**: `v20.0.0` LTS or newer (tested with Node 20 LTS & 24 LTS)
  - Verify with: `node -v`
- **npm**: `v10.0.0` or newer
  - Verify with: `npm -v`
- **Git**: For source version control
- **Web Browser**: Chrome, Firefox, Safari, or Edge

---

## 2. Repository Structure Overview

The repository contains two independent applications:

```text
tiny-notes/
├── backend/            # Express.js REST API
│   ├── data/           # Persistent JSON storage
│   ├── src/            # Application source code
│   ├── tests/          # Automated test suite
│   ├── .env.example    # Environment template
│   └── package.json
├── frontend/           # Vanilla JS static web application
│   ├── css/            # Stylesheet
│   ├── js/             # Application logic, API client, & SVG icons
│   ├── index.html      # Single-page dashboard markup
│   ├── server.js       # Zero-dependency local static server
│   └── package.json
└── docs/               # Architecture & operational guides
```

---

## 3. Backend Setup

### Step 3.1: Install Dependencies

Navigate to the `backend/` directory and install runtime and development packages:

```bash
cd backend
npm install
```

### Step 3.2: Configure Environment Variables

Copy the provided environment template:

```bash
cp .env.example .env
```

Default configuration in `.env`:
```ini
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=127.0.0.1

# CORS Allowlist (comma-separated origins)
CORS_ORIGIN=http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081

# Storage Path (relative to backend directory or absolute path)
DATA_FILE_PATH=./data/notes.json
```

### Step 3.3: Run Automated Tests

Execute the comprehensive automated test suite to ensure the API and persistence layers work properly:

```bash
npm test
```

Expected output:
```text
✔ Tiny Notes Backend API Test Suite
  ✔ GET /api/health
  ✔ POST /api/notes
  ✔ GET /api/notes and GET /api/notes/:id
  ✔ PATCH /api/notes/:id
  ✔ DELETE /api/notes/:id
  ✔ Storage Persistence Across Restarts & Crash Recovery
ℹ tests 19
ℹ pass 19
ℹ fail 0
```

### Step 3.4: Start the Backend Server

Start in development mode with automatic reload on file changes:

```bash
npm run dev
```

Or start standard production mode:

```bash
npm start
```

The API will now be listening on `http://127.0.0.1:5000`.

---

## 4. Frontend Setup

The frontend is served using a lightweight, zero-dependency Node static server during development.

Open a new terminal window:

```bash
cd frontend
npm run dev
```

The static development server will start on `http://127.0.0.1:8080` (or `http://127.0.0.1:8081` if port 8080 is already occupied by another service).

---

## 5. Verifying Full-Stack Integration

1. Open your web browser and navigate to:
   ```text
   http://localhost:8080
   ```
   *(Or port `8081` if fallback occurred)*

2. Test standard workflows:
   - **Create Note**: Click "New Note", enter a title and content, and click "Save Note".
   - **Pin Note**: Click the pin icon on any note card to prioritize it at the top.
   - **Search**: Type keywords into the search bar at the top; results will filter in real time.
   - **Edit Note**: Click on a note card to modify its content.
   - **Delete Note**: Click the trash icon and confirm the deletion prompt.
   - **Persistence Test**: Stop the backend process (`Ctrl+C`), start it again with `npm start`, and refresh the browser. All notes will remain intact.

---

## 6. Manual API Testing via curl

You can also interact directly with the backend using `curl`:

### Health Check
```bash
curl -s http://127.0.0.1:5000/api/health
```

### Create Note
```bash
curl -s -X POST http://127.0.0.1:5000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Note","content":"Testing local API","pinned":true}'
```

### List Notes
```bash
curl -s http://127.0.0.1:5000/api/notes
```

### Search Notes
```bash
curl -s "http://127.0.0.1:5000/api/notes?search=Testing"
```
