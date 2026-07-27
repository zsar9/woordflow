/**
 * Atlas design system: each language owns one hue, carried through swatches,
 * mastery bars, due-count pills and the study screen — so at a glance you
 * always know which language you're looking at without reading the label.
 */

export interface LanguageAccent {
  /** Hex used for text/borders/bars (readable on the bone background). */
  hex: string;
  /** Soft tint for pill/badge backgrounds. */
  soft: string;
}

const PALETTE: Record<string, LanguageAccent> = {
  spanish: { hex: '#A9633F', soft: '#F0E3D9' },
  french: { hex: '#4A5D8F', soft: '#E1E5F0' },
  darija: { hex: '#5B7A4F', soft: '#E5EBE1' },
  'moroccan darija': { hex: '#5B7A4F', soft: '#E5EBE1' },
  dutch: { hex: '#B08A3E', soft: '#F1E7D3' },
  german: { hex: '#5F6B7A', soft: '#E4E7EA' },
  italian: { hex: '#A6473F', soft: '#F0DFDD' },
  portuguese: { hex: '#3F7A78', soft: '#DDEBEA' },
  arabic: { hex: '#7A5B8F', soft: '#EAE1F0' },
  japanese: { hex: '#B0546F', soft: '#F1DDE4' },
  korean: { hex: '#4A7F9F', soft: '#DEEAF0' },
  mandarin: { hex: '#9F5A3F', soft: '#F0E1D9' },
  chinese: { hex: '#9F5A3F', soft: '#F0E1D9' },
  english: { hex: '#3F6F7A', soft: '#DDEAEC' },
};

const FALLBACKS: LanguageAccent[] = [
  { hex: '#8F6B4A', soft: '#EFE6DA' },
  { hex: '#4F6B5B', soft: '#E1E9E4' },
  { hex: '#6B5F8F', soft: '#E5E1F0' },
  { hex: '#8F4F5F', soft: '#F0DFE3' },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic accent color for any language string, matched or hashed. */
export function languageAccent(language: string): LanguageAccent {
  const key = language.trim().toLowerCase();
  if (PALETTE[key]) return PALETTE[key];
  return FALLBACKS[hashString(key) % FALLBACKS.length];
}
