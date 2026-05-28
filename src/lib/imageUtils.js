/**
 * Focal-point helpers.
 *
 * The focal point is stored as a URL fragment appended to the image_url:
 *   https://cdn.example.com/image.jpg#pos=35,72
 *
 * Browsers ignore the fragment when fetching the image, so <img src> works
 * normally. The app reads the fragment to apply object-position in CSS.
 *
 * x / y are integers 0–100 (percentage). Default is 50,50 (center).
 */

export function parseImagePos(url) {
  if (!url) return { src: '', x: 50, y: 50 };
  const hashIdx = url.indexOf('#');
  if (hashIdx === -1) return { src: url, x: 50, y: 50 };

  const src  = url.slice(0, hashIdx);
  const hash = url.slice(hashIdx + 1);
  if (!hash.startsWith('pos=')) return { src: url, x: 50, y: 50 };

  const [rawX, rawY] = hash.slice(4).split(',').map(Number);
  const x = isNaN(rawX) ? 50 : Math.max(0, Math.min(100, rawX));
  const y = isNaN(rawY) ? 50 : Math.max(0, Math.min(100, rawY));
  return { src, x, y };
}

export function encodeImagePos(src, x, y) {
  const base = (src || '').split('#')[0].trim();
  if (!base) return '';
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (rx === 50 && ry === 50) return base; // default → no fragment needed
  return `${base}#pos=${rx},${ry}`;
}
