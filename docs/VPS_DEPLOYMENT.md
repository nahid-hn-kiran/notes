# VPS Deployment Guide: Ubuntu 24.04 LTS

This guide provides end-to-end instructions for deploying **Tiny Notes** on an Ubuntu 24.04 LTS Virtual Private Server (such as a 1 GB RAM Google Cloud Compute Engine e2-micro / e2-small instance).

---

## 1. System Requirements & Architecture

- **Operating System**: Ubuntu 24.04 LTS
- **Hardware Profile**: 1 vCPU, 1 GB RAM, 10 GB+ SSD
- **Swap**: 1 GB - 2 GB swapfile recommended for 1 GB RAM instances
- **Software Dependencies**:
  - `Node.js` (v20 LTS or v24 LTS)
  - `npm`
  - `nginx` (High performance reverse proxy & static file server)
  - `pm2` (Production process manager)
  - `ufw` (Uncomplicated Firewall)
  - `git`

```
               [Public Internet]
                       │
             Port 80   │   Port 443
                       ▼
            [Ubuntu 24.04 UFW Firewall]
                       │
                       ▼
             [Nginx Web Server]
            ├── /        --> Serves /var/www/tiny-notes/frontend
            └── /api/    --> Reverse proxies to http://127.0.0.1:5000
                                 │
                                 ▼
                     [PM2 Process Manager]
                                 │
                     [Node.js Backend Worker]
                                 │
                     [/var/www/tiny-notes/backend/data/notes.json]
```

---

## 2. Server Preparation

Connect to your VPS via SSH:
```bash
ssh username@YOUR_SERVER_IP
```

### 2.1. Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential
```

### 2.2. Configure Swap Space (Crucial for 1 GB RAM VPS)
Small memory VPS instances can experience out-of-memory (OOM) kills during `npm install` or system bursts. Add a 1 GB swap file:

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify swap status:
```bash
free -h
```

### 2.3. Install Node.js 24 LTS via NodeSource
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v
npm -v
```

### 2.4. Install PM2 Globally
```bash
sudo npm install -g pm2
```

### 2.5. Install and Start Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.6. Configure Firewall (UFW)
Open only SSH and HTTP/HTTPS traffic. Never expose the Node backend port (5000) publicly.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status verbose
```

---

## 3. Application Directory Setup & Deployment

We recommend locating the application under `/var/www/tiny-notes`.

### 3.1. Create Application Directory & Set Permissions
```bash
sudo mkdir -p /var/www/tiny-notes
sudo chown -R $USER:$USER /var/www/tiny-notes
```

### 3.2. Clone the Repository
```bash
cd /var/www/tiny-notes
git clone <YOUR_REPOSITORY_URL> .
```

### 3.3. Install Backend Dependencies
```bash
cd /var/www/tiny-notes/backend
npm install --omit=dev
```

### 3.4. Configure Production Environment Variables
Create the backend `.env` file:
```bash
cp .env.example .env
nano .env
```

Adjust the values for production:
```ini
NODE_ENV=production
PORT=5000
HOST=127.0.0.1

# Allow same-origin requests or your domain name
CORS_ORIGIN=*

# Storage path
DATA_FILE_PATH=./data/notes.json
```

Ensure the data storage directory exists and has proper permissions:
```bash
mkdir -p /var/www/tiny-notes/backend/data
chmod 700 /var/www/tiny-notes/backend/data
```

---

## 4. PM2 Process Management

PM2 ensures the backend process automatically restarts if it crashes and boots up automatically if the server reboots.

### 4.1. Create PM2 Ecosystem File
In the project root `/var/www/tiny-notes/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'tiny-notes-api',
      cwd: '/var/www/tiny-notes/backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '127.0.0.1',
      },
      error_file: '/var/log/tiny-notes/error.log',
      out_file: '/var/log/tiny-notes/out.log',
      time: true,
    },
  ],
};
```

Create the log directory:
```bash
sudo mkdir -p /var/log/tiny-notes
sudo chown -R $USER:$USER /var/log/tiny-notes
```

### 4.2. Start the Backend with PM2
```bash
cd /var/www/tiny-notes
pm2 start ecosystem.config.cjs
pm2 save
```

### 4.3. Enable PM2 System Startup Script
Generate and register the systemd service unit:
```bash
pm2 startup systemd
```
*(Copy and execute the command that PM2 prints in the terminal).*

---

## 5. Nginx Reverse Proxy Configuration

Nginx acts as the public-facing entry point. It directly serves the static HTML/CSS/JavaScript files and proxies `/api/` requests internally to Node.js on `127.0.0.1:5000`.

### 5.1. Create Nginx Configuration Block
Create `/etc/nginx/sites-available/tiny-notes`:

```bash
sudo nano /etc/nginx/sites-available/tiny-notes
```

Paste the following configuration:

```nginx
server {
    listen 80;
    listen [::]:80;

    # Replace with your domain name or server IP address
    server_name _;

    # Root directory for frontend static files
    root /var/www/tiny-notes/frontend;
    index index.html;

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression for minimal bandwidth
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/json application/xml image/svg+xml;

    # 1. Frontend Static Assets
    location / {
        try_files $uri $uri/ /index.html =404;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # 2. Reverse Proxy for Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;

        # Standard Proxy Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts & Buffer Settings
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        proxy_buffering off;
        client_max_body_size 1m;
    }

    # 3. Deny access to hidden files and internal directories
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Deny direct access to backend directory if accidentally placed in root
    location ~ /backend {
        deny all;
        return 404;
    }

    # Logging
    access_log /var/log/nginx/tiny-notes.access.log;
    error_log /var/log/nginx/tiny-notes.error.log warn;
}
```

### 5.2. Enable Site and Test Configuration
Disable the default configuration and enable Tiny Notes:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/tiny-notes /etc/nginx/sites-enabled/

# Test syntax
sudo nginx -t
```

Expected output:
```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Reload Nginx:
```bash
sudo systemctl reload nginx
```

---

## 6. Verification

Visit `http://YOUR_SERVER_IP` in your browser.

You can also run verification checks directly on the server:

```bash
# Check local backend health
curl -s http://127.0.0.1:5000/api/health

# Check Nginx proxied API health
curl -s http://localhost/api/health

# Check frontend static delivery
curl -I http://localhost/
```

---

## 7. Updating the Application

When deploying updates to code:

```bash
cd /var/www/tiny-notes

# 1. Fetch latest changes
git pull origin main

# 2. Update backend dependencies if package.json changed
cd backend
npm install --omit=dev

# 3. Reload backend worker with zero downtime
pm2 reload tiny-notes-api

# 4. If Nginx config was modified:
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Backup and Disaster Recovery

All persistent notes are stored in `/var/www/tiny-notes/backend/data/notes.json`.

### 8.1. Create a Manual Backup
```bash
sudo cp /var/www/tiny-notes/backend/data/notes.json /var/backups/notes_$(date +%Y%m%d_%H%M%S).json
```

### 8.2. Automated Nightly Backup Cron Job
Open the crontab editor:
```bash
crontab -e
```

Add a job running every night at 2:00 AM:
```cron
0 2 * * * cp /var/www/tiny-notes/backend/data/notes.json /var/backups/notes_$(date +\%F).json
```

### 8.3. Restore from Backup
```bash
pm2 stop tiny-notes-api
cp /var/backups/notes_2026-11-06.json /var/www/tiny-notes/backend/data/notes.json
pm2 start tiny-notes-api
```

---

## 9. Common Deployment Issues & Troubleshooting

| Problem | Root Cause | Solution |
|---|---|---|
| **502 Bad Gateway** | Node.js backend is not running or listening on port 5000. | Run `pm2 status`. Check logs with `pm2 logs tiny-notes-api`. |
| **403 Forbidden** | Nginx does not have read permissions for `/var/www/tiny-notes/frontend`. | Run `sudo chmod -R 755 /var/www/tiny-notes/frontend`. |
| **Port Conflict (EADDRINUSE)** | Another process is already bound to port 5000. | Inspect with `ss -tulpn \| grep 5000` or `lsof -i :5000`. |
| **OOM Killed During npm install** | Server exhausted physical memory. | Ensure swap space is active (`free -m`, `swapon --show`). |
| **CORS Errors** | Request origin does not match backend allowlist. | Ensure `CORS_ORIGIN=*` in production `.env` or set your domain. |
| **Changes not reflected** | Browser cache or Nginx static cache. | Hard-refresh in browser (`Ctrl+Shift+R` / `Cmd+Shift+R`). |
