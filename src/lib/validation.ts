/**
 * Answer grading. Given a typed answer and the set of accepted answers, decide
 * whether it is correct, "almost" (near-miss the user can confirm), or wrong.
 *
 * Design goals:
 *  - Forgiving by default (case/accents/punctuation/articles ignored).
 *  - Multiple accepted answers + alternative spellings.
 *  - Levenshtein-based near-miss detection with configurable strictness.
 *  - Pure & deterministic so it can be unit tested exhaustively.
 */

import type { ForgivenessLevel } from '@/types';
import {
  DEFAULT_NORMALIZE,
  levenshtein,
  normalize,
  type NormalizeOptions,
} from './text';

export type GradeResult =
  | { verdict: 'correct'; matched: string }
  | { verdict: 'almost'; distance: number; closest: string }
  | { verdict: 'incorrect' };

export interface GradeConfig {
  forgiveness: ForgivenessLevel;
  enableFuzzy: boolean;
  normalize?: Partial<NormalizeOptions>;
}

/**
 * How close (edit distance relative to answer length) counts as "almost".
 * Stricter levels tolerate fewer typos before calling it wrong.
 */
const FUZZY_THRESHOLDS: Record<
  ForgivenessLevel,
  { maxAbs: number; maxRatio: number }
> = {
  // At most N absolute edits, OR up to `maxRatio` of the answer length.
  strict: { maxAbs: 1, maxRatio: 0.15 },
  balanced: { maxAbs: 2, maxRatio: 0.25 },
  lenient: { maxAbs: 3, maxRatio: 0.34 },
};

/** Split a raw accepted-answer string on common separators into candidates. */
export function splitAccepted(raw: string): string[] {
  return raw
    .split(/[;,/|]|\bor\b/gi)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build the full candidate list for a prompt: the primary expected answer plus
 * any alternates, each further split on separators. Deduplicated, order kept.
 */
export function buildAcceptedAnswers(
  primary: string,
  alternates: string[] = [],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (v: string) => {
    const t = v.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  };
  for (const chunk of [primary, ...alternates]) {
    if (!chunk) continue;
    for (const cand of splitAccepted(chunk)) push(cand);
    // Also keep the whole chunk (handles answers that legitimately contain commas).
    push(chunk);
  }
  return out;
}

function resolveNormalizeOptions(
  overrides?: Partial<NormalizeOptions>,
): NormalizeOptions {
  return { ...DEFAULT_NORMALIZE, ...(overrides ?? {}) };
}

/**
 * Grade a typed answer against accepted answers.
 */
export function gradeAnswer(
  given: string,
  accepted: string[],
  config: GradeConfig,
): GradeResult {
  const opts = resolveNormalizeOptions(config.normalize);
  const g = normalize(given, opts);

  if (g.length === 0) return { verdict: 'incorrect' };

  const normalizedAccepted = accepted
    .map((a) => ({ raw: a, norm: normalize(a, opts) }))
    .filter((a) => a.norm.length > 0);

  // 1) Exact (post-normalization) match against any accepted answer.
  for (const a of normalizedAccepted) {
    if (a.norm === g) return { verdict: 'correct', matched: a.raw };
  }

  // 2) Fuzzy near-miss detection.
  if (config.enableFuzzy) {
    const { maxAbs, maxRatio } = FUZZY_THRESHOLDS[config.forgiveness];
    let best: { distance: number; closest: string } | null = null;
    for (const a of normalizedAccepted) {
      const d = levenshtein(g, a.norm);
      if (best === null || d < best.distance) {
        best = { distance: d, closest: a.raw };
      }
    }
    if (best) {
      const targetLen = Math.max(
        1,
        ...normalizedAccepted.map((a) => a.norm.length),
      );
      const allowed = Math.max(maxAbs, Math.round(maxRatio * targetLen));
      // Guard against tiny answers where 1 edit == totally different word.
      const closestLen = normalize(best.closest, opts).length;
      const minMeaningful = closestLen >= 4;
      if (best.distance > 0 && best.distance <= allowed && minMeaningful) {
        return {
          verdict: 'almost',
          distance: best.distance,
          closest: best.closest,
        };
      }
    }
  }

  return { verdict: 'incorrect' };
}

/**
 * Produce a character-level diff between the user's answer and the correct one,
 * marking which characters of the *expected* answer were matched. Used to
 * highlight mistakes in the feedback UI.
 */
export function diffChars(
  given: string,
  expected: string,
): { char: string; ok: boolean }[] {
  const g = Array.from(given.toLocaleLowerCase());
  const e = Array.from(expected);
  const result: { char: string; ok: boolean }[] = [];
  for (let i = 0; i < e.length; i++) {
    const ok = g[i] !== undefined && g[i] === e[i].toLocaleLowerCase();
    result.push({ char: e[i], ok });
  }
  return result;
}
