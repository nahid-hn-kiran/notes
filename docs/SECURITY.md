# Security Architecture & Considerations

This document outlines the security posture, operational assumptions, hardening steps, and known security limitations of **Tiny Notes**.

---

## 1. Security Architecture & Assumptions

### Educational Scope & Intended Usage
> [!IMPORTANT]
> **Tiny Notes is engineered as a single-tenant personal application designed for learning Linux server administration, reverse proxies, and system operations.**
> 
> The application intentionally does **not** implement user accounts, authentication tokens, password hashing, or multi-tenant database partitioning. Anyone with network access to the web interface or API can read, edit, and delete notes.
> 
> **Do not deploy this application to a publicly discoverable Internet domain without placing it behind an access control layer** (such as HTTP Basic Authentication in Nginx, Cloudflare Access / Zero Trust, a Tailscale/WireGuard private VPN, or a dedicated reverse proxy authentication provider).

---

## 2. Network & Port Security

### Port Binding Model
- **Node.js Express Backend**: Configured to bind exclusively to `127.0.0.1` (`HOST=127.0.0.1`). It must **never** bind to `0.0.0.0` on a public VPS.
- **Nginx**: Binds to public interfaces on standard HTTP (80) and HTTPS (443) ports. All inbound user traffic is routed through Nginx.
- **Direct Access Prevention**: External clients cannot bypass Nginx to hit the Node backend directly.

### Firewall Configuration (UFW)
A strict default-deny firewall policy must be maintained on the Linux host:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Only ports `22` (SSH), `80` (HTTP), and `443` (HTTPS) are open to the Internet. Port `5000` is blocked from external networks by the firewall.

---

## 3. Application Hardening

### 3.1. Helmet Security Headers
The Express backend incorporates `helmet` to set baseline defensive HTTP response headers:
- `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing attacks.
- `X-Frame-Options: SAMEORIGIN / DENY`: Protects against clickjacking.
- `Strict-Transport-Security` (when running over HTTPS): Enforces TLS connections.
- Removal of the revealing `X-Powered-By: Express` header.

### 3.2. Strict Request Validation
All endpoints validate input with **Zod** before passing data to the storage engine:
- `id`: Validated as a RFC 4122 UUID v4 string. Prevents path injection, query injection, and arbitrary string lookups.
- `title`: Enforced as a non-empty string with a maximum limit of 150 characters.
- `content`: Enforced with a maximum limit of 20,000 characters.
- Malformed payloads or extra unrecognized fields are rejected with HTTP 400.

### 3.3. Request Body Limits & DoS Prevention
To protect against memory exhaustion and buffer inflation attacks:
- Express JSON parser is limited to `100kb`: `express.json({ limit: '100kb' })`.
- Nginx request body limit is set to `1m`: `client_max_body_size 1m;`.
- Payloads exceeding these limits trigger an immediate `413 Payload Too Large` error.

### 3.4. Directory Traversal & Storage Isolation
- The backend's `data/` directory is isolated outside the public static document root.
- The backend never accepts filesystem paths as parameters.
- The static development server strictly normalizes paths with `path.normalize()` and verifies that resolved paths begin with the allowed root directory (`safePath.startsWith(PUBLIC_DIR)`), rejecting any traversal sequences (`../`) with HTTP 403.
- In production, Nginx handles all static files and includes explicit deny rules for hidden files:
  ```nginx
  location ~ /\. {
      deny all;
  }
  ```

---

## 4. Secrets & Configuration Management

- No passwords, tokens, or encryption keys are committed to Git.
- The `.gitignore` file explicitly excludes:
  - `.env`
  - `.env.*.local`
  - `backend/data/*.json`
  - `*.log`
- Configuration is provided through environment variables loaded via `dotenv`.

---

## 5. Backup Security & File Permissions

- The persistent note file (`backend/data/notes.json`) should only be accessible by the application owner:
  ```bash
  chmod 700 /var/www/tiny-notes/backend/data
  chmod 600 /var/www/tiny-notes/backend/data/notes.json
  ```
- Backup archives created on the VPS (`/var/backups/notes_*.json`) should be owned by `root` or the dedicated service account with `600` permissions.

---

## 6. Recommended Next Steps for Production Hardening

When transitioning this application beyond a local/test environment, implement the following:

1. **SSL/TLS Certificates**: Issue a free Let's Encrypt certificate using `certbot`:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```
2. **Nginx HTTP Basic Authentication**:
   If hosting publicly for personal use without adding full application authentication, protect the entire site with Nginx HTTP Basic Auth:
   ```bash
   sudo apt install -y apache2-utils
   sudo htpasswd -c /etc/nginx/.htpasswd your_user
   ```
   Add to `/etc/nginx/sites-available/tiny-notes`:
   ```nginx
   auth_basic "Restricted Access";
   auth_basic_user_file /etc/nginx/.htpasswd;
   ```
3. **Fail2ban**: Install and configure `fail2ban` to automatically ban IP addresses demonstrating abusive or scanning patterns against SSH and Nginx.
