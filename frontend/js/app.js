import { api } from './api.js';
import { icons } from './icons.js';
import { showToast, createNoteCardElement, escapeHtml } from './ui.js';

class TinyNotesApp {
  constructor() {
    this.notes = [];
    this.activeSearch = '';
    this.editingNote = null;
    this.deletingNote = null;
    this.isSaving = false;

    this.cacheDOMElements();
    this.bindEvents();
    this.init();
  }

  cacheDOMElements() {
    // Header & Actions
    this.searchInput = document.getElementById('search-input');
    this.clearSearchBtn = document.getElementById('clear-search-btn');
    this.btnCreateNote = document.getElementById('btn-create-note');
    this.totalNotesCount = document.getElementById('total-notes-count');

    // Sections & Grids
    this.pinnedSection = document.getElementById('pinned-section');
    this.pinnedGrid = document.getElementById('pinned-grid');
    this.allSection = document.getElementById('all-section');
    this.allSectionHeading = document.getElementById('all-section-heading');
    this.allGrid = document.getElementById('all-grid');
    this.emptyState = document.getElementById('empty-state');
    this.loadingIndicator = document.getElementById('loading-indicator');

    // Editor Modal
    this.editorModal = document.getElementById('editor-modal');
    this.editorForm = document.getElementById('editor-form');
    this.modalTitle = document.getElementById('modal-title');
    this.noteTitleInput = document.getElementById('note-title-input');
    this.noteContentInput = document.getElementById('note-content-input');
    this.notePinnedCheckbox = document.getElementById('note-pinned-checkbox');
    this.titleCharCount = document.getElementById('title-char-count');
    this.contentCharCount = document.getElementById('content-char-count');
    this.btnSaveNote = document.getElementById('btn-save-note');
    this.btnCloseEditor = document.getElementById('btn-close-editor');
    this.btnCancelEditor = document.getElementById('btn-cancel-editor');

    // Delete Modal
    this.deleteModal = document.getElementById('delete-modal');
    this.deleteNoteTitle = document.getElementById('delete-note-title');
    this.btnConfirmDelete = document.getElementById('btn-confirm-delete');
    this.btnCancelDelete = document.getElementById('btn-cancel-delete');
    this.btnCloseDelete = document.getElementById('btn-close-delete');
  }

  bindEvents() {
    // Search
    let debounceTimer;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.activeSearch = e.target.value.trim();
        this.toggleClearSearchButton();
        this.loadNotes();
      }, 250);
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.activeSearch = '';
      this.toggleClearSearchButton();
      this.loadNotes();
      this.searchInput.focus();
    });

    // Create note button
    this.btnCreateNote.addEventListener('click', () => this.openEditor(null));

    // Editor Form Events
    this.editorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });

    this.btnCloseEditor.addEventListener('click', () => this.closeEditor());
    this.btnCancelEditor.addEventListener('click', () => this.closeEditor());

    // Character counters
    this.noteTitleInput.addEventListener('input', () => this.updateCharCounters());
    this.noteContentInput.addEventListener('input', () => this.updateCharCounters());

    // Delete Modal Events
    this.btnConfirmDelete.addEventListener('click', () => this.handleDelete());
    this.btnCancelDelete.addEventListener('click', () => this.closeDeleteModal());
    this.btnCloseDelete.addEventListener('click', () => this.closeDeleteModal());

    // Backdrop click handling
    this.editorModal.addEventListener('click', (e) => {
      if (e.target === this.editorModal) this.closeEditor();
    });
    this.deleteModal.addEventListener('click', (e) => {
      if (e.target === this.deleteModal) this.closeDeleteModal();
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.deleteModal.classList.contains('hidden')) {
          this.closeDeleteModal();
        } else if (!this.editorModal.classList.contains('hidden')) {
          this.closeEditor();
        }
      }

      // Cmd+Enter or Ctrl+Enter to save in editor
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!this.editorModal.classList.contains('hidden')) {
          e.preventDefault();
          this.handleSave();
        }
      }

      // Quick focus search with '/' key when not in an input
      if (e.key === '/' && document.activeElement !== this.noteTitleInput && document.activeElement !== this.noteContentInput && document.activeElement !== this.searchInput) {
        e.preventDefault();
        this.searchInput.focus();
      }
    });
  }

  toggleClearSearchButton() {
    if (this.searchInput.value.length > 0) {
      this.clearSearchBtn.classList.remove('hidden');
    } else {
      this.clearSearchBtn.classList.add('hidden');
    }
  }

  async init() {
    await this.loadNotes();
  }

  async loadNotes() {
    this.showLoading(true);
    try {
      this.notes = await api.getNotes(this.activeSearch);
      this.renderNotes();
    } catch (err) {
      showToast(err.message || 'Failed to load notes', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(isLoading) {
    if (isLoading) {
      this.loadingIndicator.classList.remove('hidden');
    } else {
      this.loadingIndicator.classList.add('hidden');
    }
  }

  renderNotes() {
    const totalCount = this.notes.length;
    this.totalNotesCount.textContent = `${totalCount} ${totalCount === 1 ? 'note' : 'notes'}`;

    this.pinnedGrid.innerHTML = '';
    this.allGrid.innerHTML = '';

    if (totalCount === 0) {
      this.pinnedSection.classList.add('hidden');
      this.allSection.classList.add('hidden');
      this.emptyState.classList.remove('hidden');

      const emptyTitle = this.emptyState.querySelector('.empty-state-title');
      const emptyDesc = this.emptyState.querySelector('.empty-state-description');
      const emptyActionBtn = this.emptyState.querySelector('.empty-state-btn');

      if (this.activeSearch) {
        emptyTitle.textContent = 'No matching notes found';
        emptyDesc.textContent = `No notes match "${this.activeSearch}". Try another search term.`;
        emptyActionBtn.innerHTML = `${icons.close(16)} Clear search`;
        emptyActionBtn.onclick = () => {
          this.searchInput.value = '';
          this.activeSearch = '';
          this.toggleClearSearchButton();
          this.loadNotes();
        };
      } else {
        emptyTitle.textContent = 'No notes yet';
        emptyDesc.textContent = 'Create your first note to organize ideas, tasks, or server reminders.';
        emptyActionBtn.innerHTML = `${icons.plus(16)} Create your first note`;
        emptyActionBtn.onclick = () => this.openEditor(null);
      }
      return;
    }

    this.emptyState.classList.add('hidden');

    const pinnedNotes = this.notes.filter((n) => n.pinned);
    const regularNotes = this.notes.filter((n) => !n.pinned);

    // Handlers passed to note cards
    const cardHandlers = {
      onPinToggle: (note) => this.handlePinToggle(note),
      onEdit: (note) => this.openEditor(note),
      onDelete: (note) => this.openDeleteModal(note),
    };

    // Render Pinned Notes
    if (pinnedNotes.length > 0) {
      this.pinnedSection.classList.remove('hidden');
      pinnedNotes.forEach((note) => {
        this.pinnedGrid.appendChild(createNoteCardElement(note, cardHandlers));
      });
      this.allSectionHeading.textContent = 'Other Notes';
    } else {
      this.pinnedSection.classList.add('hidden');
      this.allSectionHeading.textContent = 'All Notes';
    }

    // Render Regular Notes
    if (regularNotes.length > 0) {
      this.allSection.classList.remove('hidden');
      regularNotes.forEach((note) => {
        this.allGrid.appendChild(createNoteCardElement(note, cardHandlers));
      });
    } else if (pinnedNotes.length > 0) {
      this.allSection.classList.add('hidden');
    } else {
      this.allSection.classList.remove('hidden');
    }
  }

  async handlePinToggle(note) {
    const updatedStatus = !note.pinned;
    try {
      const updated = await api.updateNote(note.id, { pinned: updatedStatus });
      const idx = this.notes.findIndex((n) => n.id === note.id);
      if (idx !== -1) {
        this.notes[idx] = updated;
      }
      // Re-sort notes
      this.notes.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      this.renderNotes();
      showToast(updatedStatus ? 'Note pinned to top' : 'Note unpinned', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update pin status', 'error');
    }
  }

  openEditor(note = null) {
    this.editingNote = note;
    this.editorForm.reset();

    if (note) {
      this.modalTitle.textContent = 'Edit Note';
      this.noteTitleInput.value = note.title || '';
      this.noteContentInput.value = note.content || '';
      this.notePinnedCheckbox.checked = Boolean(note.pinned);
    } else {
      this.modalTitle.textContent = 'Create Note';
      this.noteTitleInput.value = '';
      this.noteContentInput.value = '';
      this.notePinnedCheckbox.checked = false;
    }

    this.updateCharCounters();
    this.editorModal.classList.remove('hidden');
    setTimeout(() => this.noteTitleInput.focus(), 50);
  }

  closeEditor() {
    this.editorModal.classList.add('hidden');
    this.editingNote = null;
    this.isSaving = false;
    this.btnSaveNote.disabled = false;
    this.btnSaveNote.innerHTML = 'Save Note';
  }

  updateCharCounters() {
    const titleLen = this.noteTitleInput.value.length;
    const contentLen = this.noteContentInput.value.length;

    this.titleCharCount.textContent = `${titleLen}/150`;
    this.contentCharCount.textContent = `${contentLen}/20,000`;

    if (titleLen > 150) {
      this.titleCharCount.classList.add('char-overflow');
    } else {
      this.titleCharCount.classList.remove('char-overflow');
    }

    if (contentLen > 20000) {
      this.contentCharCount.classList.add('char-overflow');
    } else {
      this.contentCharCount.classList.remove('char-overflow');
    }
  }

  async handleSave() {
    if (this.isSaving) return;

    const title = this.noteTitleInput.value.trim();
    const content = this.noteContentInput.value.trim();
    const pinned = this.notePinnedCheckbox.checked;

    if (!title) {
      showToast('Title is required', 'error');
      this.noteTitleInput.focus();
      return;
    }

    if (title.length > 150) {
      showToast('Title cannot exceed 150 characters', 'error');
      this.noteTitleInput.focus();
      return;
    }

    if (content.length > 20000) {
      showToast('Content cannot exceed 20,000 characters', 'error');
      this.noteContentInput.focus();
      return;
    }

    this.isSaving = true;
    this.btnSaveNote.disabled = true;
    this.btnSaveNote.innerHTML = `${icons.loader(16)} Saving...`;

    try {
      if (this.editingNote) {
        const updated = await api.updateNote(this.editingNote.id, { title, content, pinned });
        showToast('Note updated successfully', 'success');
      } else {
        await api.createNote({ title, content, pinned });
        showToast('Note created successfully', 'success');
      }

      this.closeEditor();
      await this.loadNotes();
    } catch (err) {
      const detailMsg = err.details?.length ? err.details.map((d) => d.message).join(', ') : err.message;
      showToast(detailMsg || 'Failed to save note', 'error');
    } finally {
      this.isSaving = false;
      this.btnSaveNote.disabled = false;
      this.btnSaveNote.innerHTML = 'Save Note';
    }
  }

  openDeleteModal(note) {
    this.deletingNote = note;
    this.deleteNoteTitle.textContent = `"${note.title}"`;
    this.deleteModal.classList.remove('hidden');
    this.btnConfirmDelete.focus();
  }

  closeDeleteModal() {
    this.deleteModal.classList.add('hidden');
    this.deletingNote = null;
  }

  async handleDelete() {
    if (!this.deletingNote) return;

    const noteId = this.deletingNote.id;
    this.btnConfirmDelete.disabled = true;
    this.btnConfirmDelete.innerHTML = `${icons.loader(16)} Deleting...`;

    try {
      await api.deleteNote(noteId);
      showToast('Note deleted successfully', 'success');
      this.closeDeleteModal();
      await this.loadNotes();
    } catch (err) {
      showToast(err.message || 'Failed to delete note', 'error');
    } finally {
      this.btnConfirmDelete.disabled = false;
      this.btnConfirmDelete.innerHTML = 'Delete Note';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TinyNotesApp();
});
