// generates a favicon for based on the last requested color

import { elements } from './elements.js';

export function generateFavicon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="160" height="160" x="20" y="20" fill="${color}"/></svg>`;
  elements.favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
