import { CONFIG } from './config.js';

class ApiClient {
  constructor(baseUrl = CONFIG.API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async #request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let res;
    try {
      res = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError) {
      throw new Error(`Unable to connect to server: ${networkError.message}`);
    }

    let payload;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const errorMessage =
        payload?.error?.message ||
        `Request failed with status code ${res.status} (${res.statusText})`;
      const err = new Error(errorMessage);
      err.status = res.status;
      err.details = payload?.error?.details || [];
      throw err;
    }

    return payload;
  }

  async checkHealth() {
    return this.#request('/health');
  }

  async getNotes(search = '') {
    const query = search ? `?search=${encodeURIComponent(search.trim())}` : '';
    const res = await this.#request(`/notes${query}`);
    return res.data || [];
  }

  async getNote(id) {
    const res = await this.#request(`/notes/${id}`);
    return res.data;
  }

  async createNote({ title, content, pinned }) {
    const res = await this.#request('/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content, pinned }),
    });
    return res.data;
  }

  async updateNote(id, { title, content, pinned }) {
    const body = {};
    if (title !== undefined) body.title = title;
    if (content !== undefined) body.content = content;
    if (pinned !== undefined) body.pinned = pinned;

    const res = await this.#request(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return res.data;
  }

  async deleteNote(id) {
    return this.#request(`/notes/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
