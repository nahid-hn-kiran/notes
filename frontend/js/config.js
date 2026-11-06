// Configuration module for Tiny Notes frontend

function resolveApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__API_URL__) {
    return window.__API_URL__;
  }

  // In local development on any dev port other than 5000, point to backend on port 5000
  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port && port !== '5000') {
        return `http://${hostname}:5000/api`;
      }
    }
  }

  // In production behind reverse proxy (e.g. Nginx proxying /api), use relative path
  return '/api';
}

export const CONFIG = {
  API_BASE_URL: resolveApiBaseUrl(),
};
