/**
 * Pure functions that turn a list's words + their stats + a session config into
 * an ordered queue of questions. Kept pure so ordering logic is unit-testable.
 */

import type {
  Direction,
  QuestionOrder,
  SessionConfig,
  Word,
  WordStat,
} from '@/types';
import { isDue } from '@/lib/srs';
import { buildAcceptedAnswers } from '@/lib/validation';

export interface Question {
  word: Word;
  direction: Direction;
  prompt: string;
  /** The primary expected answer (for display). */
  expected: string;
  /** All accepted answers (primary + alternates + synonyms). */
  accepted: string[];
  hint?: string;
  notes?: string;
}

/** Deterministic-ish shuffle (Fisher–Yates) with an injectable RNG. */
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function resolveDirection(
  configDir: Direction | 'mixed',
  rng: () => number,
): Direction {
  if (configDir === 'mixed') {
    return rng() < 0.5 ? 'foreign-to-native' : 'native-to-foreign';
  }
  return configDir;
}

export function buildQuestion(word: Word, direction: Direction): Question {
  if (direction === 'foreign-to-native') {
    return {
      word,
      direction,
      prompt: word.foreign,
      expected: word.native,
      accepted: buildAcceptedAnswers(word.native, word.nativeAlt),
      notes: word.notes,
    };
  }
  return {
    word,
    direction,
    prompt: word.native,
    expected: word.foreign,
    accepted: buildAcceptedAnswers(word.foreign, word.foreignAlt),
    notes: word.notes,
  };
}

/** Filter words down to the eligible set per the config's toggles. */
export function filterWords(
  words: Word[],
  statsById: Map<string, WordStat>,
  config: SessionConfig,
): Word[] {
  return words.filter((w) => {
    const st = statsById.get(w.id);
    if (config.onlyBookmarked && !w.bookmarked) return false;
    if (config.onlyDifficult && (st?.difficultyScore ?? 3) < 3) return false;
    if (config.onlyIncorrect && (st?.incorrect ?? 0) === 0) return false;
    if (config.onlyNew && (st?.timesStudied ?? 0) > 0) return false;
    // Also honor order-based "only" filters.
    if (config.order === 'only-bookmarked' && !w.bookmarked) return false;
    if (config.order === 'only-difficult' && (st?.difficultyScore ?? 3) < 3) return false;
    if (config.order === 'only-incorrect' && (st?.incorrect ?? 0) === 0) return false;
    return true;
  });
}

function sortWords(
  words: Word[],
  statsById: Map<string, WordStat>,
  order: QuestionOrder,
  rng: () => number,
  now: number,
): Word[] {
  const st = (id: string) => statsById.get(id);
  switch (order) {
    case 'sequential':
      return words.slice().sort((a, b) => a.order - b.order);
    case 'random':
    case 'mixed':
      return shuffle(words, rng);
    case 'newest-first':
      return words.slice().sort((a, b) => b.createdAt - a.createdAt);
    case 'least-studied':
      return words
        .slice()
        .sort((a, b) => (st(a.id)?.timesStudied ?? 0) - (st(b.id)?.timesStudied ?? 0));
    case 'hardest-first':
    case 'only-difficult':
      return words
        .slice()
        .sort((a, b) => (st(b.id)?.difficultyScore ?? 3) - (st(a.id)?.difficultyScore ?? 3));
    case 'weakest-first':
      return words
        .slice()
        .sort((a, b) => (st(a.id)?.mastery ?? 0) - (st(b.id)?.mastery ?? 0));
    case 'only-incorrect':
      return words
        .slice()
        .sort((a, b) => (st(b.id)?.incorrect ?? 0) - (st(a.id)?.incorrect ?? 0));
    case 'only-bookmarked':
      return words.slice().sort((a, b) => a.order - b.order);
    case 'spaced-repetition': {
      // Due words first (by how overdue), then the rest by weakest mastery.
      const due = words.filter((w) => isDue(st(w.id) ?? ({ dueAt: 0 } as WordStat), now));
      const notDue = words.filter((w) => !isDue(st(w.id) ?? ({ dueAt: 0 } as WordStat), now));
      due.sort((a, b) => (st(a.id)?.dueAt ?? 0) - (st(b.id)?.dueAt ?? 0));
      notDue.sort((a, b) => (st(a.id)?.mastery ?? 0) - (st(b.id)?.mastery ?? 0));
      return [...due, ...notDue];
    }
    default:
      return words.slice();
  }
}

/** Build the final ordered question queue for a session. */
export function buildQueue(
  words: Word[],
  stats: WordStat[],
  config: SessionConfig,
  rng: () => number = Math.random,
  now = Date.now(),
): Question[] {
  const statsById = new Map(stats.map((s) => [s.wordId, s]));
  const eligible = filterWords(words, statsById, config);
  const sorted = sortWords(eligible, statsById, config.order, rng, now);
  const limited =
    config.count === 'all' ? sorted : sorted.slice(0, Math.max(1, config.count));
  return limited.map((w) => buildQuestion(w, resolveDirection(config.direction, rng)));
}
