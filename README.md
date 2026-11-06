# Tiny Notes

A production-conscious, lightweight note-taking application designed for learning Linux server administration, VPS deployment, networking, reverse proxies, and process management.

Built with an independent **Node.js/Express** backend and a zero-dependency **Vanilla JavaScript** frontend.

---

## Features

- **Note Management**: Create, view, edit, and delete notes with confirmation dialogues.
- **Pinning**: Pin high-priority notes to remain at the top of your dashboard.
- **Real-Time Search**: Search notes by title or content with instant query filtering.
- **Safe Persistence**: File-based JSON storage with atomic writes (`.tmp` write + atomic `rename`) and FIFO write queue concurrency control to eliminate file corruption.
- **Crash Recovery**: Automatic backup and clean initialization if storage data is corrupted or malformed.
- **Production Hardened**: Pre-configured with Helmet security headers, CORS origin controls, Zod schema validation, payload size constraints, and graceful `SIGTERM`/`SIGINT` shutdown handling.
- **Zero-Build Frontend**: Vanilla HTML5, CSS3, modern Fetch API, and embedded Lucide SVG icons. No build steps, bundlers, or heavy frontend frameworks.
- **VPS Ready**: Optimized for low-memory environments (1 GB RAM Ubuntu 24.04 LTS VPS on GCP Compute Engine).

---

## Repository Structure

```text
tiny-notes/
├── backend/                  # Node.js Express REST API
│   ├── data/                 # JSON file storage directory
│   ├── src/
│   │   ├── config/           # Environment and path resolution
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Error handling, logging, 404
│   │   ├── routes/           # Health and Note REST routes
│   │   ├── storage/          # Atomic file storage engine
│   │   ├── validation/       # Zod schemas
│   │   ├── app.js            # Express application setup
│   │   └── server.js         # HTTP server entrypoint
│   ├── tests/                # Automated API test suite
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/                 # Vanilla JS SPA
│   ├── css/
│   │   └── style.css         # Minimal, clean responsive styles
│   ├── js/
│   │   ├── api.js            # Fetch API client
│   │   ├── app.js            # Main dashboard controller & shortcuts
│   │   ├── config.js         # Dynamic API endpoint resolution
│   │   ├── icons.js          # Lightweight Lucide SVG generators
│   │   └── ui.js             # DOM renderers, toasts, modal helpers
│   ├── index.html            # Single page markup
│   ├── server.js             # Zero-dependency local dev server
│   └── package.json
│
├── docs/                     # Architectural and operational guides
│   ├── ARCHITECTURE.md       # High-level architecture & request lifecycle
│   ├── LOCAL_SETUP.md        # Local workstation setup instructions
│   ├── VPS_DEPLOYMENT.md     # Ubuntu 24.04, Nginx & PM2 deployment
│   ├── OPERATIONS.md         # Linux server runbook & monitoring
│   └── SECURITY.md           # Security model & hardening guide
│
├── ecosystem.config.cjs      # PM2 production process configuration
├── .gitignore
└── README.md
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20 LTS or v24 LTS (`node -v`)
- **npm**: v10+ (`npm -v`)

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
The backend API starts on `http://127.0.0.1:5000`.

### 3. Frontend Setup
In a separate terminal window:
```bash
cd frontend
npm run dev
```
The frontend static server will start on `http://127.0.0.1:8080` (or `http://127.0.0.1:8081` if 8080 is already occupied). Open that URL in your browser.

---

## Automated Tests

Run the backend test suite:
```bash
cd backend
npm test
```
The test suite utilizes Node's native test runner (`node:test`) and isolated temporary storage directories to ensure tests never touch or destroy real application data.

---

## API Specification

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Health check & uptime | 200 |
| `GET` | `/api/notes` | List all notes (supports `?search=term`) | 200 |
| `GET` | `/api/notes/:id` | Retrieve a single note by UUID | 200, 400, 404 |
| `POST` | `/api/notes` | Create a new note | 201, 400 |
| `PATCH` | `/api/notes/:id` | Update note title, content, or pin state | 200, 400, 404 |
| `DELETE` | `/api/notes/:id` | Delete a note | 200, 400, 404 |

---

## Production Deployment Overview

In production on an Ubuntu 24.04 VPS:
1. **Nginx** serves the static frontend directly from `/var/www/tiny-notes/frontend` and proxies `/api/` traffic to `127.0.0.1:5000`.
2. **PM2** runs the backend API worker as a managed background process with automatic restart on failure and system startup integration.
3. **UFW** allows only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS), keeping the Node backend isolated on local loopback.

For comprehensive deployment instructions, see [docs/VPS_DEPLOYMENT.md](docs/VPS_DEPLOYMENT.md).

---

## Documentation Index

- [Architecture & Design Details](docs/ARCHITECTURE.md)
- [Local Development Guide](docs/LOCAL_SETUP.md)
- [VPS Deployment with Nginx & PM2](docs/VPS_DEPLOYMENT.md)
- [Server Operations & Troubleshooting Runbook](docs/OPERATIONS.md)
- [Security Considerations & Hardening](docs/SECURITY.md)

---

## License

MIT
