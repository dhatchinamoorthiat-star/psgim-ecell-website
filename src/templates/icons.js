/**
 * Inline SVG. Inlined rather than loaded as a sprite or an icon font: there
 * are a dozen of them, they are tiny, and this costs zero extra requests.
 *
 * Every icon is aria-hidden — icons here are always decoration beside a real
 * text label, never the label itself.
 */

export const arrow = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const arrowUpRight = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const menu = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

export const close = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

export const sun = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export const moon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

export const social = {
  instagram: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38A5.85 5.85 0 0 0 .63 4.14c-.3.76-.5 1.64-.56 2.9C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.85 5.85 0 0 0 2.12-1.38 5.85 5.85 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.85 5.85 0 0 0-1.38-2.12A5.85 5.85 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-10.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"/></svg>`,
};

/** Per-initiative glyphs. Keyed by initiative id. */
export const initiativeIcon = {
  "founders-on-campus": `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H13l-4 3.5V16H4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.5 9.5h7M8.5 12.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  bootcamp: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.8c2.8 2.6 4.2 5.8 4.2 9.2 0 2.4-.6 4.3-1.5 5.8h-5.4c-.9-1.5-1.5-3.4-1.5-5.8 0-3.4 1.4-6.6 4.2-9.2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="10" r="1.8" stroke="currentColor" stroke-width="1.5"/><path d="M8 16.5 5.5 19l3.4-.7M16 16.5 18.5 19l-3.4-.7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  ideathon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.5 3.5h9v4.2a4.5 4.5 0 0 1-9 0Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.5 5h-3v1.6A2.9 2.9 0 0 0 7.4 9.5M16.5 5h3v1.6a2.9 2.9 0 0 1-2.9 2.9M12 12.2v4.3M9 20.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9 16.5h6v4H9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  "nec-drive": `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.8" stroke="currentColor" stroke-width="1.5"/><path d="M3.2 12h17.6M12 3.2c2.2 2.4 3.4 5.5 3.4 8.8s-1.2 6.4-3.4 8.8c-2.2-2.4-3.4-5.5-3.4-8.8S9.8 5.6 12 3.2Z" stroke="currentColor" stroke-width="1.5"/></svg>`,
  ambassadors: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.5"/><path d="M3 19.5c0-3.1 2.7-5 6-5s6 1.9 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16.5 5.6a3.2 3.2 0 0 1 0 5.6M18.4 14.9c1.7.8 2.6 2.4 2.6 4.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  "idea-clinic": `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20.5S3.8 16 3.8 9.9a4.1 4.1 0 0 1 8.2-1.4 4.1 4.1 0 0 1 8.2 1.4c0 6.1-8.2 10.6-8.2 10.6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
};

/** NEC incentive glyphs, keyed by title. */
export const necIcon = {
  "Cash prizes": `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M14.5 9.2A2.8 2.8 0 0 0 12 8c-1.7 0-2.6.9-2.6 2s1 1.8 2.6 2 2.6.9 2.6 2-1 2-2.6 2a2.8 2.8 0 0 1-2.5-1.2M12 6.4v11.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  "Official documentation": `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 2.8h8l5 5v13.4H6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 2.8v5h5M9 13h6M9 16.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  "E-Summit passes": `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8.5a2 2 0 0 0 0 7v3h18v-3a2 2 0 0 1 0-7v-3H3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 6.5v11" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2.5"/></svg>`,
  Networking: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="4.8" r="2.3" stroke="currentColor" stroke-width="1.5"/><circle cx="4.8" cy="18" r="2.3" stroke="currentColor" stroke-width="1.5"/><circle cx="19.2" cy="18" r="2.3" stroke="currentColor" stroke-width="1.5"/><path d="M10.6 6.9 6.2 15.9M13.4 6.9l4.4 9M7.1 18h9.8" stroke="currentColor" stroke-width="1.5"/></svg>`,
  Mentorship: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.8 20 6v6c0 5-3.6 7.7-8 8.6C7.6 19.7 4 17 4 12V6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m9 12 2.2 2.2L15.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  "Resume value": `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4.5h16v13H4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 8.5h16M8 20h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  Certification: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="9" r="5.2" stroke="currentColor" stroke-width="1.5"/><path d="m8.2 13.6-1.4 7 5.2-2.6 5.2 2.6-1.4-7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
};
