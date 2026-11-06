import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';

export class NoteStorage {
  #writeQueue = Promise.resolve();

  constructor(filePath = config.dataFilePath) {
    this.filePath = path.resolve(filePath);
    this.dirPath = path.dirname(this.filePath);
  }

  async init() {
    await this.#ensureStorageFile();
  }

  async #ensureStorageFile() {
    await fs.mkdir(this.dirPath, { recursive: true });

    try {
      await fs.access(this.filePath);
      const raw = await fs.readFile(this.filePath, 'utf-8');
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          await this.#backupAndReset('File did not contain a JSON array');
        }
      } catch (err) {
        await this.#backupAndReset(`Malformed JSON: ${err.message}`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        await this.#atomicWrite([]);
      } else {
        throw err;
      }
    }
  }

  async #backupAndReset(reason) {
    const backupPath = `${this.filePath}.corrupted.${Date.now()}`;
    console.warn(`[Storage Warning] ${reason}. Backing up corrupted file to ${backupPath} and re-initializing.`);
    try {
      await fs.copyFile(this.filePath, backupPath);
    } catch {
      // If copying fails (e.g. file unreadable), continue with reset
    }
    await this.#atomicWrite([]);
  }

  async #atomicWrite(data) {
    const tempPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    const serialized = JSON.stringify(data, null, 2);

    await fs.writeFile(tempPath, serialized, 'utf-8');
    await fs.rename(tempPath, this.filePath);
  }

  async #enqueueWrite(operation) {
    const run = async () => {
      await this.#ensureStorageFile();
      return await operation();
    };

    const next = this.#writeQueue.then(run, run);
    this.#writeQueue = next.catch(() => {});
    return next;
  }

  async getAll({ search } = {}) {
    await this.#ensureStorageFile();
    const raw = await fs.readFile(this.filePath, 'utf-8');
    let notes = [];
    try {
      notes = JSON.parse(raw);
    } catch {
      notes = [];
    }

    if (!Array.isArray(notes)) {
      notes = [];
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim().toLowerCase();
      notes = notes.filter((note) => {
        const titleMatch = (note.title || '').toLowerCase().includes(term);
        const contentMatch = (note.content || '').toLowerCase().includes(term);
        return titleMatch || contentMatch;
      });
    }

    // Sort: pinned first (true before false), then by updatedAt desc
    notes.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return notes;
  }

  async getById(id) {
    const notes = await this.getAll();
    return notes.find((note) => note.id === id) || null;
  }

  async create({ title, content = '', pinned = false }) {
    return this.#enqueueWrite(async () => {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const notes = JSON.parse(raw);

      const now = new Date().toISOString();
      const newNote = {
        id: uuidv4(),
        title: title.trim(),
        content: typeof content === 'string' ? content.trim() : '',
        pinned: Boolean(pinned),
        createdAt: now,
        updatedAt: now,
      };

      notes.push(newNote);
      await this.#atomicWrite(notes);
      return newNote;
    });
  }

  async update(id, updates) {
    return this.#enqueueWrite(async () => {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const notes = JSON.parse(raw);
      const index = notes.findIndex((note) => note.id === id);

      if (index === -1) {
        return null;
      }

      const existing = notes[index];
      const now = new Date().toISOString();

      const updatedNote = {
        ...existing,
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.content !== undefined ? { content: updates.content.trim() } : {}),
        ...(updates.pinned !== undefined ? { pinned: Boolean(updates.pinned) } : {}),
        updatedAt: now,
      };

      notes[index] = updatedNote;
      await this.#atomicWrite(notes);
      return updatedNote;
    });
  }

  async delete(id) {
    return this.#enqueueWrite(async () => {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const notes = JSON.parse(raw);
      const index = notes.findIndex((note) => note.id === id);

      if (index === -1) {
        return false;
      }

      notes.splice(index, 1);
      await this.#atomicWrite(notes);
      return true;
    });
  }
}

export const defaultStorage = new NoteStorage();
