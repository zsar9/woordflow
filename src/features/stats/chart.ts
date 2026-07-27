/**
 * Theme-aware chart colors. Recharts needs concrete color strings, so we read
 * the live CSS custom properties (which flip with light/dark) via getters.
 */

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallback;
  // Values are "r g b" triples.
  return `rgb(${raw.split(/\s+/).join(' ')})`;
}

export const chartColors = {
  get brand() {
    return readVar('--c-brand', 'rgb(99 102 241)');
  },
  get success() {
    return readVar('--c-success', 'rgb(22 163 110)');
  },
  get warning() {
    return readVar('--c-warning', 'rgb(202 138 4)');
  },
  get danger() {
    return readVar('--c-danger', 'rgb(220 68 68)');
  },
  get muted() {
    return readVar('--c-border', 'rgb(200 200 210)');
  },
  get axis() {
    return readVar('--c-subtle', 'rgb(140 140 150)');
  },
  get grid() {
    return readVar('--c-border', 'rgb(230 230 235)');
  },
  get tooltipBg() {
    return readVar('--c-elevated', 'rgb(255 255 255)');
  },
};

/** A categorical palette for multi-series charts (brand-neutral, accessible). */
export const categorical = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#a855f7',
];
