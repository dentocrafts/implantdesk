import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Capitalises the first letter of every word as the user types. */
export const toTitleCase = v =>
  v.replace(/(^|\s)\S/g, c => c.toUpperCase());

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStockStatus(qty, threshold) {
  const t = threshold ?? (() => {
    try {
      const s = JSON.parse(localStorage.getItem('implantdesk-settings') || '{}');
      return s.lowStockThreshold ?? 5;
    } catch { return 5; }
  })();
  if (qty === 0) return { label: 'Out of Stock', color: 'destructive', variant: 'destructive' };
  if (qty <= t) return { label: 'Low Stock', color: 'yellow', variant: 'warning' };
  return { label: 'In Stock', color: 'green', variant: 'success' };
}

export async function copyToClipboard(text) {
  // Prefer the modern Clipboard API when available and permitted
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to the textarea fallback
    }
  }
  // Fallback: create an off-screen textarea and execCommand
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(el);
  }
}

export const SYSTEM_COLORS = {
  Straumann: 'bg-blue-100 text-blue-700 border-blue-200',
  'Nobel Biocare': 'bg-purple-100 text-purple-700 border-purple-200',
  Osstem: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  MIS: 'bg-orange-100 text-orange-700 border-orange-200',
  BioHorizons: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

/**
 * Returns { className, style } for a system colour badge.
 * When the user has set a custom hex colour it uses inline CSS;
 * otherwise it falls back to the hardcoded Tailwind class string.
 */
export function getSystemStyle(system, customColors = {}) {
  const hex = customColors?.[system];
  if (hex) {
    return {
      className: '',
      style: {
        backgroundColor: hex + '26',  // ~15 % opacity
        borderColor:     hex + '40',  // ~25 % opacity
        color:           hex,
      },
    };
  }
  return {
    className: SYSTEM_COLORS[system] || 'bg-slate-500/20 text-slate-700 border-slate-200',
    style: {},
  };
}

export const IMPLANT_SYSTEMS = ['Straumann', 'Nobel Biocare', 'Osstem', 'MIS', 'BioHorizons'];
export const ABUTMENT_TYPES = [
  'Straight',
  'Angled 17°',
  'Angled 30°',
  'Multi-unit',
  'Multi Abutment',
  'Multi Angled 17°',
  'Multi Angled 30°',
  'Angled Selector',
  'Transfer Abutment',
  'Temporary',
  'Scan Body',
];
export const SCREW_TYPES = ['Prosthetic Screw', 'Healing Screw', 'Cover Screw', 'Abutment Screw'];
export const MATERIALS = ['Titanium', 'Zirconia', 'PEEK', 'Titanium-Zirconia', 'Gold-plated Titanium'];
export const GINGIVAL_HEIGHTS = [1, 2, 3, 4, 5, 6];
export const SCREW_LENGTHS = [6, 8, 10, 12, 14, 16];
export const PLATFORM_DIAMETERS = [3.5, 4.1, 4.5, 4.8, 5.0, 5.5, 6.0, 7.0];
