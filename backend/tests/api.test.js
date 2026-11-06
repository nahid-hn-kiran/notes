import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { NoteStorage } from '../src/storage/noteStorage.js';

describe('Tiny Notes Backend API Test Suite', () => {
  let tempDir;
  let testStoragePath;
  let storage;
  let testApp;

  before(async () => {
    // Isolate test storage in a temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiny-notes-test-'));
    testStoragePath = path.join(tempDir, 'test-notes.json');
    storage = new NoteStorage(testStoragePath);
    await storage.init();
    testApp = createApp({ storage });
  });

  after(async () => {
    // Clean up temporary test files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error if already removed
    }
  });

  describe('GET /api/health', () => {
    it('should return 200 with status ok and valid timestamp', async () => {
      const res = await request(testApp).get('/api/health');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.ok(typeof res.body.timestamp === 'string');
      assert.ok(!Number.isNaN(Date.parse(res.body.timestamp)));
      assert.ok(typeof res.body.uptime === 'number');
    });
  });

  describe('POST /api/notes', () => {
    it('should create a note with valid title and content', async () => {
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          title: 'Learn Nginx Reverse Proxy',
          content: 'Configure proxy_pass to http://127.0.0.1:5000',
          pinned: true,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.title, 'Learn Nginx Reverse Proxy');
      assert.equal(res.body.data.content, 'Configure proxy_pass to http://127.0.0.1:5000');
      assert.equal(res.body.data.pinned, true);
      assert.ok(res.body.data.createdAt);
      assert.ok(res.body.data.updatedAt);
    });

    it('should default pinned to false when omitted', async () => {
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          title: 'Unpinned Note',
          content: 'Just some thought',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.pinned, false);
    });

    it('should fail with 400 if title is missing', async () => {
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          content: 'No title provided',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.details.some((d) => d.field === 'title'));
    });

    it('should fail with 400 if title is empty or only whitespace', async () => {
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          title: '   ',
          content: 'Empty title content',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.details.some((d) => d.field === 'title'));
    });

    it('should fail with 400 if title exceeds 150 characters', async () => {
      const longTitle = 'a'.repeat(151);
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          title: longTitle,
          content: 'Valid content',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.details.some((d) => d.field === 'title'));
    });

    it('should fail with 400 if content exceeds 20,000 characters', async () => {
      const longContent = 'b'.repeat(20001);
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          title: 'Valid title',
          content: longContent,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.details.some((d) => d.field === 'content'));
    });
  });

  describe('GET /api/notes and GET /api/notes/:id', () => {
    let createdNoteId;

    before(async () => {
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          title: 'Specific Note for Query',
          content: 'Unique Searchable Keyword: Zephyr',
          pinned: false,
        });
      createdNoteId = res.body.data.id;
    });

    it('should list all notes', async () => {
      const res = await request(testApp).get('/api/notes');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 2);
    });

    it('should filter notes by search term in title or content', async () => {
      const res = await request(testApp).get('/api/notes?search=Zephyr');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].id, createdNoteId);
    });

    it('should retrieve a single note by valid ID', async () => {
      const res = await request(testApp).get(`/api/notes/${createdNoteId}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, createdNoteId);
      assert.equal(res.body.data.title, 'Specific Note for Query');
    });

    it('should return 400 for an invalid UUID parameter', async () => {
      const res = await request(testApp).get('/api/notes/not-a-valid-uuid');

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.details.some((d) => d.field === 'id'));
    });

    it('should return 404 for a non-existent UUID', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(testApp).get(`/api/notes/${nonExistentUuid}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  describe('PATCH /api/notes/:id', () => {
    let noteToUpdateId;

    before(async () => {
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          title: 'Original Title',
          content: 'Original Content',
          pinned: false,
        });
      noteToUpdateId = res.body.data.id;
    });

    it('should update note title, content, and pinned status', async () => {
      const res = await request(testApp)
        .patch(`/api/notes/${noteToUpdateId}`)
        .send({
          title: 'Updated Title',
          pinned: true,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, noteToUpdateId);
      assert.equal(res.body.data.title, 'Updated Title');
      assert.equal(res.body.data.content, 'Original Content');
      assert.equal(res.body.data.pinned, true);
    });

    it('should return 400 when update payload is empty', async () => {
      const res = await request(testApp)
        .patch(`/api/notes/${noteToUpdateId}`)
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('should return 404 when updating non-existent note', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(testApp)
        .patch(`/api/notes/${nonExistentUuid}`)
        .send({ title: 'New Title' });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  describe('DELETE /api/notes/:id', () => {
    let noteToDeleteId;

    before(async () => {
      const res = await request(testApp)
        .post('/api/notes')
        .send({
          title: 'Note to be deleted',
          content: 'Will be removed soon',
        });
      noteToDeleteId = res.body.data.id;
    });

    it('should delete existing note', async () => {
      const res = await request(testApp).delete(`/api/notes/${noteToDeleteId}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, 'Note deleted successfully');

      // Verify it cannot be retrieved
      const getRes = await request(testApp).get(`/api/notes/${noteToDeleteId}`);
      assert.equal(getRes.status, 404);
    });

    it('should return 404 when deleting a note that does not exist', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(testApp).delete(`/api/notes/${nonExistentUuid}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  describe('Storage Persistence Across Restarts & Crash Recovery', () => {
    it('should persist notes across storage re-instantiation (simulating app restart)', async () => {
      const uniqueTitle = `Persistent Test Note ${Date.now()}`;
      const created = await storage.create({
        title: uniqueTitle,
        content: 'Data must survive server restarts on disk',
        pinned: true,
      });

      // Create a brand new storage instance with the same file path
      const restartedStorage = new NoteStorage(testStoragePath);
      await restartedStorage.init();

      const fetched = await restartedStorage.getById(created.id);
      assert.ok(fetched);
      assert.equal(fetched.id, created.id);
      assert.equal(fetched.title, uniqueTitle);
      assert.equal(fetched.pinned, true);
    });

    it('should safely recover and create a backup if the storage file is corrupted', async () => {
      const corruptedFilePath = path.join(tempDir, 'corrupted-notes.json');
      // Write invalid malformed JSON
      await fs.writeFile(corruptedFilePath, '{ invalid json corrupted content !!', 'utf-8');

      const corruptedStorage = new NoteStorage(corruptedFilePath);
      // init should detect malformed JSON, back it up, and reset cleanly to []
      await corruptedStorage.init();

      const notes = await corruptedStorage.getAll();
      assert.deepEqual(notes, []);

      // Verify backup file was created
      const files = await fs.readdir(tempDir);
      const backupFile = files.find((f) => f.startsWith('corrupted-notes.json.corrupted.'));
      assert.ok(backupFile, 'Backup file should have been created');
    });
  });
});
