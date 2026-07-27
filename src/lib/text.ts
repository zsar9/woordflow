/**
 * Text utilities: Unicode-aware normalization and edit distance.
 * Kept dependency-free and pure so they're trivial to unit-test.
 */

/** Options controlling how aggressively input is normalized before comparison. */
export interface NormalizeOptions {
  ignoreCase: boolean;
  ignoreAccents: boolean;
  ignorePunctuation: boolean;
  ignoreArticles: boolean;
  collapseWhitespace: boolean;
}

export const DEFAULT_NORMALIZE: NormalizeOptions = {
  ignoreCase: true,
  ignoreAccents: true,
  ignorePunctuation: true,
  ignoreArticles: true,
  collapseWhitespace: true,
};

/**
 * Leading articles that are optional when matching. Includes the common
 * Romance/Germanic articles a learner may or may not type. Arabic "al-" is
 * handled via punctuation/hyphen stripping rather than here.
 */
const OPTIONAL_ARTICLES = new Set([
  // English
  'the',
  'a',
  'an',
  // Dutch
  'de',
  'het',
  'een',
  // German
  'der',
  'die',
  'das',
  'ein',
  'eine',
  // French
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  "l'",
  // Elided forms — after punctuation stripping "l'" becomes a bare "l".
  'l',
  'd',
  "d'",
  // Spanish / Italian / Portuguese
  'el',
  'los',
  'las',
  'uno',
  'una',
  'lo',
  'gli',
  'o',
  'os',
  'as',
  'um',
  'uma',
]);

/** Strip diacritics via NFD decomposition, removing combining marks. */
export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Remove punctuation that should never affect correctness. We keep letters,
 * numbers, and whitespace across all scripts (Unicode property escapes).
 */
function stripPunctuation(input: string): string {
  // Replace anything that is not a letter/number/whitespace with a space so
  // "well-known" and "well known" collapse to the same token stream.
  return input.replace(/[^\p{L}\p{N}\s]/gu, ' ');
}

function dropLeadingArticle(input: string): string {
  const parts = input.split(' ');
  if (parts.length > 1 && OPTIONAL_ARTICLES.has(parts[0])) {
    return parts.slice(1).join(' ');
  }
  return input;
}

/** Normalize a raw answer/expected string for comparison. */
export function normalize(
  input: string,
  opts: NormalizeOptions = DEFAULT_NORMALIZE,
): string {
  let s = input ?? '';
  s = s.trim();
  if (opts.ignoreCase) s = s.toLocaleLowerCase();
  if (opts.ignoreAccents) s = stripAccents(s);
  if (opts.ignorePunctuation) s = stripPunctuation(s);
  if (opts.collapseWhitespace) s = s.replace(/\s+/g, ' ').trim();
  if (opts.ignoreArticles) s = dropLeadingArticle(s);
  return s;
}

/**
 * Levenshtein edit distance (insert/delete/substitute = 1). Iterative with a
 * single rolling row — O(n) memory, O(n·m) time. Operates on Unicode code
 * points so multi-byte characters count as one edit.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const s = Array.from(a);
  const t = Array.from(b);
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  let prev = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;

  for (let i = 1; i <= s.length; i++) {
    let curr = [i];
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    prev = curr;
  }
  return prev[t.length];
}

/** Similarity ratio in [0,1] derived from edit distance. */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(Array.from(a).length, Array.from(b).length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Count grapheme-ish length (code points, not UTF-16 units). */
export function charLength(input: string): number {
  return Array.from(input).length;
}
