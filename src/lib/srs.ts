/**
 * Spaced-repetition scheduling.
 *
 * A pragmatic SM-2 variant tuned for typing recall. On each answer we update:
 *   - ease factor (how fast intervals grow)
 *   - interval (days until next review)
 *   - reps (consecutive successes)
 *   - mastery (0..1 smoothed success estimate)
 *   - difficultyScore (0..5, inverse-ish of ease, surfaced in the UI)
 *
 * Confidence self-reports and a per-word seed difficulty nudge the ease factor
 * so "lucky guesses" don't inflate intervals.
 */

import {
  CONFIDENCE_META,
  type AnswerOutcome,
  type Confidence,
  type WordStat,
} from '@/types';

const MS_PER_DAY = 86_400_000;
const MIN_EASE = 1.3;
const MAX_EASE = 3.2;

/** Create the initial stat row for a freshly created word. */
export function initialStat(
  wordId: string,
  listId: string,
  seedDifficulty = 3,
): WordStat {
  return {
    wordId,
    listId,
    timesStudied: 0,
    correct: 0,
    incorrect: 0,
    almost: 0,
    skipped: 0,
    hintsUsed: 0,
    totalResponseMs: 0,
    totalCharsTyped: 0,
    currentStreak: 0,
    longestStreak: 0,
    mastery: 0,
    difficultyScore: seedDifficulty,
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    dueAt: Date.now(),
    gradeHistory: [],
  };
}

export interface ReviewInput {
  outcome: AnswerOutcome;
  responseMs: number;
  hintsUsed: number;
  charsTyped: number;
  confidence?: Confidence;
  /** Injectable clock for deterministic tests. */
  now?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Map an outcome to an SM-2-style quality grade (0..5).
 * Correct=5, correct-with-hint≈4, almost=3, incorrect=1, skipped=2.
 */
function qualityFor(input: ReviewInput): number {
  switch (input.outcome) {
    case 'correct':
      return input.hintsUsed > 0 ? 4 : 5;
    case 'almost':
      return 3;
    case 'skipped':
      return 2;
    case 'incorrect':
    default:
      return 1;
  }
}

/** Apply a review to a stat row, returning a NEW stat (pure). */
export function applyReview(prev: WordStat, input: ReviewInput): WordStat {
  const now = input.now ?? Date.now();
  const q = qualityFor(input);
  const passed = q >= 3; // almost or better counts as a pass for scheduling
  const confFactor = input.confidence
    ? CONFIDENCE_META[input.confidence].factor
    : 1;

  const next: WordStat = { ...prev, gradeHistory: [...prev.gradeHistory] };

  // --- counters ---
  next.timesStudied += 1;
  next.totalResponseMs += Math.max(0, input.responseMs);
  next.totalCharsTyped += Math.max(0, input.charsTyped);
  next.hintsUsed += input.hintsUsed;
  next.lastStudiedAt = now;

  // A skip records the counter but must NOT alter scheduling, streaks, ease,
  // mastery, or difficulty — it's a "come back later", not a failure.
  if (input.outcome === 'skipped') {
    next.skipped += 1;
    return next;
  }

  switch (input.outcome) {
    case 'correct':
      next.correct += 1;
      break;
    case 'almost':
      next.almost += 1;
      break;
    case 'incorrect':
      next.incorrect += 1;
      break;
  }

  // --- streaks --- (skips already returned above, so this is correct/almost/incorrect)
  if (input.outcome === 'correct') {
    next.currentStreak = prev.currentStreak + 1;
    next.longestStreak = Math.max(prev.longestStreak, next.currentStreak);
  } else {
    next.currentStreak = 0;
  }

  // --- ease factor (SM-2 formula, scaled by confidence) ---
  let ease = prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  ease *= confFactor >= 1 ? 1 + (confFactor - 1) * 0.1 : confFactor;
  ease = clamp(ease, MIN_EASE, MAX_EASE);
  next.ease = Number(ease.toFixed(3));

  // --- interval & reps ---
  if (!passed) {
    next.reps = 0;
    next.intervalDays = 0; // relearn immediately (same day)
  } else {
    next.reps = prev.reps + 1;
    let interval: number;
    if (next.reps === 1) interval = 1;
    else if (next.reps === 2) interval = 3;
    else interval = Math.round(prev.intervalDays * next.ease);
    // Confidence trims or extends the interval a little.
    interval = Math.max(1, Math.round(interval * (0.7 + 0.3 * confFactor)));
    // Hints shrink the interval (you needed help).
    if (input.hintsUsed > 0) interval = Math.max(1, Math.round(interval * 0.6));
    next.intervalDays = interval;
  }
  next.dueAt = now + next.intervalDays * MS_PER_DAY;

  // --- mastery: exponential moving average of pass quality (0..1) ---
  const target = q / 5;
  const alpha = 0.3;
  next.mastery = clamp(prev.mastery + alpha * (target - prev.mastery), 0, 1);

  // --- difficulty score (0 easy .. 5 hard): inverse of ease, blended ---
  const easeDifficulty = clamp(
    ((MAX_EASE - next.ease) / (MAX_EASE - MIN_EASE)) * 5,
    0,
    5,
  );
  next.difficultyScore = Number(
    clamp(prev.difficultyScore * 0.6 + easeDifficulty * 0.4, 0, 5).toFixed(2),
  );

  // --- grade history (0..100) ---
  next.gradeHistory.push(Math.round((q / 5) * 100));
  if (next.gradeHistory.length > 50) next.gradeHistory.shift();

  return next;
}

/** Is this word due for review at `now`? */
export function isDue(stat: WordStat, now = Date.now()): boolean {
  return stat.dueAt <= now;
}

/** A word is "mastered" when both the smoothed estimate and interval are high. */
export function isMastered(stat: WordStat): boolean {
  return stat.mastery >= 0.85 && stat.intervalDays >= 7 && stat.reps >= 3;
}

/** Human label for a difficulty score. */
export function difficultyLabel(score: number): string {
  if (score < 1) return 'Easy';
  if (score < 2) return 'Comfortable';
  if (score < 3) return 'Moderate';
  if (score < 4) return 'Challenging';
  return 'Difficult';
}
