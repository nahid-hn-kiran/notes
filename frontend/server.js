import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.HOST || '127.0.0.1';
const PREFERRED_PORT = Number.parseInt(process.env.PORT || '8080', 10);
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Resolve safe path and prevent directory traversal
    const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
    if (!safePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Forbidden');
    }

    let stats;
    try {
      stats = await fs.stat(safePath);
      if (stats.isDirectory()) {
        const indexPath = path.join(safePath, 'index.html');
        stats = await fs.stat(indexPath);
        return serveFile(indexPath, res, req.method === 'HEAD');
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h1>404 Not Found</h1><p>The requested file does not exist.</p>');
      }
      throw err;
    }

    await serveFile(safePath, res, req.method === 'HEAD');
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

async function serveFile(filePath, res, isHead) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const content = await fs.readFile(filePath);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(content),
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });

  if (isHead) {
    return res.end();
  }

  res.end(content);
}

function listen(port) {
  server.listen(port, HOST, () => {
    console.log('==================================================');
    console.log('  Tiny Notes Frontend Static Server');
    console.log(`  Serving from: ${PUBLIC_DIR}`);
    console.log(`  URL: http://${HOST}:${port}`);
    console.log('==================================================');
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !process.env.PORT) {
    console.warn(`Port ${PREFERRED_PORT} is in use. Attempting fallback to port ${PREFERRED_PORT + 1}...`);
    listen(PREFERRED_PORT + 1);
  } else {
    console.error(`Failed to start frontend server on ${HOST}:${PREFERRED_PORT}:`, err.message);
    process.exit(1);
  }
});

listen(PREFERRED_PORT);

const handleShutdown = () => {
  console.log('\nShutting down frontend server...');
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
