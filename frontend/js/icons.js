// Lightweight Lucide icon SVG generators

const SVG_ATTRIBUTES = 'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const icons = {
  plus: (size = 18, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,

  search: (size = 18, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,

  pin: (size = 16, className = '', filled = false) =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" fill="${filled ? 'currentColor' : 'none'}" class="lucide-icon ${className}"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,

  edit: (size = 16, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,

  trash: (size = 16, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,

  close: (size = 18, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,

  check: (size = 18, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><polyline points="20 6 9 17 4 12"/></svg>`,

  alert: (size = 18, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,

  fileText: (size = 32, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,

  logo: (size = 22, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon ${className}"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>`,

  loader: (size = 18, className = '') =>
    `<svg ${SVG_ATTRIBUTES} width="${size}" height="${size}" class="lucide-icon spin ${className}"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
};
