/**
 * Tide (Mint) design system: each language owns one hue, carried through
 * swatches, mastery bars, due-count pills and the study screen — so at a
 * glance you always know which language you're looking at without reading
 * the label. Tuned to sit against the cool mist canvas (#f2f8fa).
 */

export interface LanguageAccent {
  /** Hex used for text/borders/bars (readable on the mist background). */
  hex: string;
  /** Soft tint for pill/badge backgrounds. */
  soft: string;
}

const PALETTE: Record<string, LanguageAccent> = {
  spanish: { hex: '#0F6D8C', soft: '#EEF6F8' }, // lagoon — matches the mockup's ES chip
  french: { hex: '#1C7057', soft: '#DFF3EC' }, // coral-green — matches the mockup's FR chip
  darija: { hex: '#2C6B58', soft: '#E6F6F0' }, // matches the mockup's DA chip
  'moroccan darija': { hex: '#2C6B58', soft: '#E6F6F0' },
  dutch: { hex: '#B08A3E', soft: '#F5EEDA' },
  german: { hex: '#5B7A8F', soft: '#E4EDF0' },
  italian: { hex: '#A6473F', soft: '#F3E0DD' },
  portuguese: { hex: '#3F8F8A', soft: '#DDF0EE' },
  arabic: { hex: '#7A5B8F', soft: '#EDE5F5' },
  japanese: { hex: '#B0546F', soft: '#F5DFE6' },
  korean: { hex: '#3F7FA0', soft: '#DEEEF5' },
  mandarin: { hex: '#9F6A3F', soft: '#F3E7D9' },
  chinese: { hex: '#9F6A3F', soft: '#F3E7D9' },
  english: { hex: '#3F7A8F', soft: '#DDEEF0' },
};

const FALLBACKS: LanguageAccent[] = [
  { hex: '#0F6D8C', soft: '#EEF6F8' },
  { hex: '#2C6B58', soft: '#E6F6F0' },
  { hex: '#6B5F9F', soft: '#E9E5F5' },
  { hex: '#9F4F6B', soft: '#F5E0E7' },
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
