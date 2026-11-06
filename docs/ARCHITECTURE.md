# System Architecture: Tiny Notes

## 1. Executive Summary

**Tiny Notes** is an intentionally lightweight, production-conscious, full-stack personal note-taking application designed for hosting on constrained Linux environments (such as a 1 GB RAM Ubuntu 24.04 VPS).

The application strictly separates concerns into two decoupled layers:
- **Backend**: A minimal Node.js/Express REST API utilizing ES Modules, strict Zod schema validation, Helmet security hardening, and a safe, atomic, file-based JSON persistence engine.
- **Frontend**: A zero-dependency Vanilla JavaScript dashboard rendered entirely in the browser using HTML5, CSS3, modern Fetch API, and embedded Lucide SVG icons.

```
+-------------------------------------------------------------------------+
|                                Client                                   |
|   (Desktop / Mobile Browser - Vanilla JS SPA + Fetch API)               |
+------------------------------------+------------------------------------+
                                     |
                                     | HTTP / HTTPS (Port 80 / 443)
                                     v
+------------------------------------+------------------------------------+
|                       Nginx Reverse Proxy                               |
|   - Serves Frontend static files directly from disk                     |
|   - Proxies /api/ requests to 127.0.0.1:5000                            |
+------------------------------------+------------------------------------+
                                     |
                                     | Local Loopback (127.0.0.1:5000)
                                     v
+------------------------------------+------------------------------------+
|               Node.js Express Backend (PM2 Managed)                     |
|   - Helmet security headers, CORS origin verification                  |
|   - Zod request validation                                              |
|   - Centralized error handling & structured logging                     |
+------------------------------------+------------------------------------+
                                     |
                                     | Atomic file write (.tmp -> rename)
                                     v
+-------------------------------------------------------------------------+
|                   File-based JSON Storage Engine                        |
|                       (data/notes.json)                                 |
+-------------------------------------------------------------------------+
```

---

## 2. Frontend / Backend Communication

1. **Protocol & Contract**:
   - The frontend communicates with the backend exclusively via standard HTTP/1.1 or HTTP/2 using standard JSON payloads over REST conventions.
   - All successful responses and business errors adhere to a standardized envelope format:

   *Success Response*:
   ```json
   {
     "success": true,
     "data": { ... }
   }
   ```

   *Error Response*:
   ```json
   {
     "success": false,
     "error": {
       "message": "Human-readable error description",
       "details": [
         { "field": "title", "message": "Title is required" }
       ]
     }
   }
   ```

2. **Environment Dynamic Base URL Resolution**:
   - The frontend does not hardcode production URLs.
   - In `frontend/js/config.js`, the base API URL is computed dynamically:
     - If `window.__API_URL__` is injected, it uses that value.
     - In local development (`localhost` / `127.0.0.1` on port 8080/8081), it automatically targets `http://127.0.0.1:5000/api`.
     - In production behind Nginx, it resolves to the relative path `/api`, matching the reverse proxy location block.

---

## 3. API Request Lifecycle

Every inbound request to the backend passes through the following pipeline:

```
Inbound Request
       │
       ▼
1. Helmet Security Middleware (CSP, frameguard, noSniff, xssFilter)
       │
       ▼
2. CORS Middleware (Origin verification against configured allowlist)
       │
       ▼
3. Body Parser (express.json() & express.urlencoded() capped at 100 KB)
       │
       ▼
4. Request Logger Middleware (timestamp, method, path, status, duration)
       │
       ▼
5. Route Handlers & Zod Validation Middleware:
   - Param validation: idParamSchema (ensures valid UUID v4)
   - Body validation: createNoteSchema / updateNoteSchema
       │
       ▼
6. NoteStorage Persistence Operations (FIFO serialized write queue)
       │
       ▼
7. Centralized Error Handler (Transforms ZodError, SyntaxError, or internal exceptions)
       │
       ▼
Outbound Response
```

---

## 4. Data Persistence & Write Safety Strategy

The storage layer is implemented in [`backend/src/storage/noteStorage.js`](file:///home/nahid-hasan/projects/devops/tiny-notes/backend/src/storage/noteStorage.js). It provides robust file-based storage suitable for a single-instance deployment without relying on an external database daemon.

### 4.1. Safe Write Mechanism (Atomic File Swapping)
Directly writing or appending to an active JSON file can lead to file corruption if the server crashes, experiences an unhandled exception, or loses power mid-write. Tiny Notes uses an atomic write strategy:
1. Serialize the full note state to a unique temporary file in the same directory:
   `${dataFilePath}.tmp.${Date.now()}.${randomHash}`
2. Flush data to the disk.
3. Perform an atomic rename operation (`fs.promises.rename`). On POSIX-compliant filesystems (including Linux ext4), renaming a file within the same filesystem is an atomic inode switch. If the write fails or the process terminates prematurely, the original `notes.json` remains completely intact.

### 4.2. Concurrency Control (Serialized Promise Queue)
JavaScript executes asynchronously in an event loop. If two HTTP requests (`POST` or `PATCH`) arrive simultaneously, reading and writing the file concurrently could cause the second write to overwrite the first.

To eliminate race conditions, `NoteStorage` implements an internal serialized write queue (`#enqueueWrite`):
- All mutate operations (`create`, `update`, `delete`) chain onto a private promise queue.
- Writes are processed strictly in FIFO sequence.
- Reads (`getAll`, `getById`) always receive a consistent snapshot of the data.

### 4.3. Malformed File Recovery
On startup and during read operations, if `notes.json` contains invalid JSON (for example, if manual administrative edits caused syntax errors):
1. The storage engine catches the parse error.
2. It automatically creates a timestamped safety backup: `notes.json.corrupted.<timestamp>`.
3. It initializes a clean, empty state (`[]`), allowing the server to continue running without a crash.

### 4.4. Limitations of JSON File Storage
While ideal for small-scale applications and learning environments:
- **Single Instance Only**: Cannot be scaled horizontally across multiple instances or servers without a shared clustered filesystem or database.
- **Whole-File I/O**: Every write serializes the entire array of notes. While negligible for thousands of notes (a few megabytes), it is not intended for datasets with hundreds of thousands of records.
- **No Complex Indexes**: Queries (like search and sort) are performed in memory rather than via B-trees or inverted search indexes.

---

## 5. Production Architecture

In production on Ubuntu 24.04:

```
[Internet]
    │
    ▼ Port 80 / 443
[UFW Firewall]
    │
    ▼
[Nginx Reverse Proxy]
    ├── Location /      ──> Serves static files directly from /var/www/tiny-notes/frontend
    └── Location /api/   ──> Proxies via HTTP to http://127.0.0.1:5000 (Backend)
                                │
                                ▼
                    [PM2 Process Manager]
                                │
                    [Node.js Backend Worker (127.0.0.1:5000)]
                                │
                    [backend/data/notes.json]
```

1. **Process Management**:
   - The backend runs as a background daemon managed by **PM2**.
   - PM2 handles automatic restart on crashes, zero-downtime reloads, memory limits, and integration with `systemd` to survive server reboots.
2. **Reverse Proxy & Web Server**:
   - **Nginx** handles static assets (HTML, CSS, JS) with high-efficiency kernel sendfile.
   - Nginx terminates client connections, proxies API traffic to localhost port 5000, and filters out malicious request headers.
   - The backend binds only to `127.0.0.1`, ensuring the Express API is never directly exposed to the public Internet without proxy inspection.
