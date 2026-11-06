# Server Operations Runbook

This document is a quick, practical operations reference for managing, debugging, and inspecting **Tiny Notes** on an Ubuntu server.

---

## 1. Quick Health & Status Checks

### Check PM2 Managed Processes
```bash
pm2 status
```
Outputs CPU, memory usage, uptime, restarts, and current status of `tiny-notes-api`.

### Check Nginx Web Server Status
```bash
sudo systemctl status nginx
```

### Check Port Bindings
Verify that Node is listening locally on 5000 and Nginx is listening on 80/443:
```bash
sudo ss -tulpn | grep -E ':5000|:80|:443'
```
Or with `lsof`:
```bash
sudo lsof -i :5000
sudo lsof -i :80
```

---

## 2. Process & Resource Inspection

### Check Memory Utilization
```bash
free -h
```
Key fields to watch:
- `available`: Memory available for starting new applications without swapping.
- `swap used`: Indicates whether the system is under memory pressure.

### Check Disk Space
```bash
df -h /
```
Check disk utilization to ensure logs or temp files haven't filled the disk.

### Process Monitoring
Interactive top view sorted by memory:
```bash
top -o %MEM
```
Or using `htop` (if installed):
```bash
htop
```

List exact process information for Node:
```bash
ps aux | grep node
```

---

## 3. Reading Application & System Logs

### PM2 Application Logs
Stream live real-time logs from the API:
```bash
pm2 logs tiny-notes-api
```

View the last 100 lines:
```bash
pm2 logs tiny-notes-api --lines 100 --nostream
```

### Nginx Web Server Logs
Stream live Nginx access requests:
```bash
sudo tail -f /var/log/nginx/tiny-notes.access.log
```

Stream live Nginx error logs (vital for diagnosing 502/504 errors):
```bash
sudo tail -f /var/log/nginx/tiny-notes.error.log
```

### Systemd Journal Logs
Inspect PM2 system service logs:
```bash
journalctl -u pm2-$USER -n 50 --no-pager
```

Inspect Nginx systemd logs:
```bash
journalctl -u nginx -n 50 --no-pager
```

---

## 4. Service Control & Restarting

### Restarting the Node Backend
Zero-downtime reload:
```bash
pm2 reload tiny-notes-api
```

Hard restart:
```bash
pm2 restart tiny-notes-api
```

Stop backend:
```bash
pm2 stop tiny-notes-api
```

### Restarting Nginx
Check configuration syntax before reloading:
```bash
sudo nginx -t
```

Gracefully reload configuration without dropping connections:
```bash
sudo systemctl reload nginx
```

Hard restart:
```bash
sudo systemctl restart nginx
```

---

## 5. Testing API Availability via CLI

### Test Local Backend Directly (Bypassing Nginx)
```bash
curl -i http://127.0.0.1:5000/api/health
```
Expected output:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
{"status":"ok","timestamp":"2026-11-06T07:10:08.599Z","uptime":120,"environment":"production"}
```

### Test Through Nginx Reverse Proxy
```bash
curl -i http://localhost/api/health
```

### Create a Test Note via CLI
```bash
curl -s -X POST http://localhost/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"CLI Ops Verification","content":"System is operational"}'
```

---

## 6. Diagnosing Common HTTP Error Codes

### 502 Bad Gateway
- **Symptom**: Nginx responds with `502 Bad Gateway`.
- **Cause**: Nginx received a connection refused when trying to reach `http://127.0.0.1:5000`. The Node.js API is either crashed, stopped, or listening on a different port.
- **Diagnostic Steps**:
  1. Check PM2 status: `pm2 status`.
  2. Inspect PM2 logs: `pm2 logs tiny-notes-api --lines 50`.
  3. Verify port 5000: `sudo ss -tulpn | grep 5000`.
  4. Test local loopback: `curl http://127.0.0.1:5000/api/health`.

### 504 Gateway Timeout
- **Symptom**: Nginx responds with `504 Gateway Timeout` after 30 or 60 seconds.
- **Cause**: The Node.js event loop is completely blocked or waiting on an unresolved I/O lock.
- **Diagnostic Steps**:
  1. Inspect CPU load: `top`.
  2. Look for memory exhaustion causing thrashing.
  3. Restart worker: `pm2 restart tiny-notes-api`.

### 413 Payload Too Large
- **Symptom**: API returns `413 Payload Too Large`.
- **Cause**: The submitted note content exceeds the Express body parser limit (`100kb`) or the Nginx `client_max_body_size` directive (`1m`).
- **Resolution**: Remind users that notes are intended for text up to 20,000 characters. If larger payloads are legitimate, adjust `express.json({ limit: '1mb' })` in `backend/src/app.js` and `client_max_body_size` in `/etc/nginx/sites-available/tiny-notes`.

### 404 Not Found on Static Files
- **Symptom**: Loading `http://YOUR_SERVER_IP/` returns Nginx 404.
- **Cause**: `root` path in Nginx config does not match actual filesystem path, or permissions prevent the `www-data` user from traversing directories.
- **Resolution**:
  1. Verify path exists: `ls -la /var/www/tiny-notes/frontend/index.html`.
  2. Verify folder permissions: `chmod 755 /var/www/tiny-notes/frontend`.
