import { icons } from './icons.js';

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  let iconSvg = icons.alert(18);
  if (type === 'success') iconSvg = icons.check(18);

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Dismiss notification">${icons.close(14)}</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 200);
  });

  container.appendChild(toast);

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    if (toast.isConnected) {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 200);
    }
  }, 3500);
}

export function createNoteCardElement(note, { onPinToggle, onEdit, onDelete }) {
  const card = document.createElement('article');
  card.className = `note-card ${note.pinned ? 'is-pinned' : ''}`;
  card.dataset.id = note.id;

  const formattedDate = formatDate(note.updatedAt || note.createdAt);
  const isUpdated = note.updatedAt && note.createdAt && note.updatedAt !== note.createdAt;
  const dateLabel = isUpdated ? `Updated ${formattedDate}` : `Created ${formattedDate}`;

  card.innerHTML = `
    <div class="note-card-header">
      <h3 class="note-card-title">${escapeHtml(note.title)}</h3>
      <button class="icon-button btn-pin ${note.pinned ? 'active' : ''}" 
              title="${note.pinned ? 'Unpin note' : 'Pin note'}" 
              aria-label="${note.pinned ? 'Unpin note' : 'Pin note'}">
        ${icons.pin(16, '', note.pinned)}
      </button>
    </div>
    <div class="note-card-body">
      <p class="note-card-content">${escapeHtml(note.content || 'No additional content')}</p>
    </div>
    <div class="note-card-footer">
      <time class="note-card-date" datetime="${note.updatedAt || note.createdAt}">${dateLabel}</time>
      <div class="note-card-actions">
        <button class="icon-button btn-edit" title="Edit note" aria-label="Edit note">
          ${icons.edit(15)}
        </button>
        <button class="icon-button btn-delete" title="Delete note" aria-label="Delete note">
          ${icons.trash(15)}
        </button>
      </div>
    </div>
  `;

  // Attach event handlers
  const pinBtn = card.querySelector('.btn-pin');
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onPinToggle(note);
  });

  const editBtn = card.querySelector('.btn-edit');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onEdit(note);
  });

  const deleteBtn = card.querySelector('.btn-delete');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete(note);
  });

  // Clicking the card opens edit modal
  card.addEventListener('click', () => {
    onEdit(note);
  });

  return card;
}
