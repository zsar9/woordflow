import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  AnswerOutcome,
  Confidence,
  SessionConfig,
  SessionItem,
  SessionSummary,
  StudySession,
  Word,
  WordStat,
} from '@/types';
import { gradeAnswer, type GradeResult } from '@/lib/validation';
import { applyReview, isMastered } from '@/lib/srs';
import { buildQueue, buildQuestion, type Question } from './queue';
import { uid, now } from '@/lib/id';
import { putStat, saveSession, recordActivity, updateList } from '@/db/repo';

export type Phase =
  | 'prompt' // awaiting input
  | 'correct' // showed correct feedback + spelling, auto-advancing
  | 'incorrect' // showed the right answer, awaiting continue / self-approval
  | 'almost' // near-miss, awaiting continue / self-approval
  | 'done';

export interface EngineState {
  phase: Phase;
  index: number; // pointer into the (growing) queue
  total: number; // questions in the queue right now, retries included
  answeredCount: number;
  current?: Question;
  input: string;
  streak: number;
  lastResult?: GradeResult;
  hintText: string;
  hintsUsedForCurrent: number;
  /** True once we've moved past the first pass into the repeat round. */
  isRetryRound: boolean;
  /** Questions still ahead, queued repeats included. */
  remaining: number;
}

export interface StudyEngine extends EngineState {
  setInput: (v: string) => void;
  submit: () => void;
  continueNext: () => void; // Space/Enter after a wrong answer
  markCorrect: () => void; // "I was right" — learner overrides the grader
  skipDwell: () => void; // Enter again during the post-correct pause — advance now
  useHint: () => void;
  skip: () => void;
  exit: () => Promise<StudySession>; // persist & return the session
  progress: number; // 0..1
}

interface InitArgs {
  words: Word[];
  stats: WordStat[];
  config: SessionConfig;
  listName: string;
  isReview?: boolean;
  autoAdvanceMs: number;
}

/**
 * Answer checking is always balanced fuzzy matching — the setup screen no
 * longer exposes strictness. When the grader is wrong the learner overrides it
 * with the "I was right" button instead of pre-tuning a slider.
 */
const GRADE_CONFIG = { forgiveness: 'balanced' as const, enableFuzzy: true };

/**
 * How long a correct answer stays on screen so the spelling can be read,
 * before auto-advancing. A learner in a hurry doesn't have to wait this out —
 * see `skipDwell`, wired to pressing Enter again during this pause.
 */
const MIN_CORRECT_DWELL_MS = 900;

export function computeSummary(
  items: SessionItem[],
  startedAt: number,
  endedAt: number,
  masteryGained: number,
  wordsMastered: number,
  wordsNeedingReview: number,
): SessionSummary {
  const total = items.length;
  const correct = items.filter((i) => i.outcome === 'correct').length;
  const almost = items.filter((i) => i.outcome === 'almost').length;
  const incorrect = items.filter((i) => i.outcome === 'incorrect').length;
  const skipped = items.filter((i) => i.outcome === 'skipped').length;
  const graded = correct + almost + incorrect; // skips excluded from accuracy
  const accuracy = graded ? Math.round((correct / graded) * 100) : 0;
  // Grade gives partial credit for "almost".
  const grade = graded
    ? Math.round(((correct + almost * 0.5) / graded) * 100)
    : 0;
  const times = items.filter((i) => i.responseMs > 0).map((i) => i.responseMs);
  const avgResponseMs = times.length
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : 0;
  const fastestMs = times.length ? Math.min(...times) : 0;
  const slowestMs = times.length ? Math.max(...times) : 0;

  // Longest correct streak within the session.
  let longest = 0;
  let run = 0;
  for (const it of items) {
    if (it.outcome === 'correct') {
      run++;
      longest = Math.max(longest, run);
    } else if (it.outcome !== 'skipped') run = 0;
  }

  const durationMs = endedAt - startedAt;
  const xp = correct * 10 + almost * 4 + Math.round(longest * 2);

  return {
    total,
    correct,
    almost,
    incorrect,
    skipped,
    accuracy,
    grade,
    avgResponseMs,
    fastestMs,
    slowestMs,
    longestStreak: longest,
    durationMs,
    xp,
    masteryGained: Number(masteryGained.toFixed(3)),
    wordsMastered,
    wordsNeedingReview,
  };
}

export function useStudyEngine(args: InitArgs): StudyEngine {
  const { words, stats, config, listName, isReview, autoAdvanceMs } = args;

  // Build the queue once per mount (stable RNG via Math.random is fine here).
  const initialQueue = useMemo(
    () => buildQueue(words, stats, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const statsMap = useRef<Map<string, WordStat>>(
    new Map(stats.map((s) => [s.wordId, { ...s }])),
  );
  const queueRef = useRef<Question[]>(initialQueue);
  const itemsRef = useRef<SessionItem[]>([]);
  const sessionStart = useRef(now());
  const questionStart = useRef(now());
  /** Length of the first pass — anything at or beyond this index is a repeat. */
  const firstPassLength = useRef(initialQueue.length);
  const masteryBaseline = useRef(stats.reduce((acc, s) => acc + s.mastery, 0));

  /**
   * The verdict being shown in the incorrect/almost phase. It is not written to
   * the session or the SRS until the learner either continues (accepting it) or
   * overrides it — so "I was right" never has to undo a scheduling update.
   */
  const pendingItem = useRef<SessionItem | null>(null);

  // Every wrong answer requeues the word again — there is no cap. A word the
  // learner keeps missing keeps coming back, including on the very last
  // question of the session, until it's finally answered correctly (or the
  // learner overrides the grader with "I was right"). Skips are likewise
  // unbounded — see `skip()`.

  const [state, setState] = useState<EngineState>(() => ({
    phase: initialQueue.length ? 'prompt' : 'done',
    index: 0,
    total: initialQueue.length,
    answeredCount: 0,
    current: initialQueue[0],
    input: '',
    streak: 0,
    hintText: '',
    hintsUsedForCurrent: 0,
    isRetryRound: false,
    remaining: initialQueue.length,
  }));

  // Keep a ref to latest state for callbacks that need it synchronously.
  const stateRef = useRef(state);
  stateRef.current = state;

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  const setInput = useCallback((v: string) => {
    setState((s) => (s.phase === 'prompt' ? { ...s, input: v } : s));
  }, []);

  /** Persist a stat update for a given word using the SRS. */
  const applyStat = useCallback(
    (
      wordId: string,
      outcome: AnswerOutcome,
      responseMs: number,
      hints: number,
      charsTyped: number,
      confidence?: Confidence,
    ) => {
      const prev = statsMap.current.get(wordId);
      if (!prev) return;
      const next = applyReview(prev, {
        outcome,
        responseMs,
        hintsUsed: hints,
        charsTyped,
        confidence,
        now: now(),
      });
      statsMap.current.set(wordId, next);
      void putStat(next);
    },
    [],
  );

  /** Send a word to the very back of the session so it comes round again. */
  const requeue = useCallback((q: Question) => {
    queueRef.current.push(buildQuestion(q.word, q.direction));
  }, []);

  const goToIndex = useCallback((nextIndex: number) => {
    clearTimer();
    pendingItem.current = null;
    const q = queueRef.current[nextIndex];
    questionStart.current = now();
    if (!q) {
      setState((s) => ({ ...s, phase: 'done', remaining: 0 }));
      return;
    }
    setState((s) => ({
      ...s,
      phase: 'prompt',
      index: nextIndex,
      current: q,
      input: '',
      hintText: '',
      hintsUsedForCurrent: 0,
      lastResult: undefined,
      total: queueRef.current.length,
      isRetryRound: nextIndex >= firstPassLength.current,
      remaining: queueRef.current.length - nextIndex,
    }));
  }, []);

  const buildItem = useCallback(
    (outcome: AnswerOutcome, given: string, overridden?: boolean): SessionItem => {
      const s = stateRef.current;
      const q = s.current!;
      return {
        wordId: q.word.id,
        direction: q.direction,
        prompt: q.prompt,
        expected: q.expected,
        given,
        outcome,
        responseMs: now() - questionStart.current,
        hintsUsed: s.hintsUsedForCurrent,
        overridden,
      };
    },
    [],
  );

  const commitItem = useCallback(
    (item: SessionItem) => {
      itemsRef.current.push(item);
      applyStat(
        item.wordId,
        item.outcome,
        item.responseMs,
        item.hintsUsed,
        item.given.length,
      );
    },
    [applyStat],
  );

  const proceedAfterAnswer = useCallback(() => {
    const nextIndex = stateRef.current.index + 1;
    setState((s) => ({ ...s, answeredCount: s.answeredCount + 1 }));
    goToIndex(nextIndex);
  }, [goToIndex]);

  const submit = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'prompt' || !s.current) return;
    const given = s.input.trim();

    // Enter on an empty field is a wrong answer, not a no-op: same instant
    // feedback, same correct spelling, and the word comes back at the end.
    const result: GradeResult = given
      ? gradeAnswer(given, s.current.accepted, GRADE_CONFIG)
      : { verdict: 'incorrect' };

    if (result.verdict === 'correct') {
      commitItem(buildItem('correct', given));
      setState((st) => ({
        ...st,
        phase: 'correct',
        lastResult: result,
        streak: st.streak + 1,
      }));
      advanceTimer.current = setTimeout(
        proceedAfterAnswer,
        Math.max(MIN_CORRECT_DWELL_MS, autoAdvanceMs),
      );
      return;
    }

    pendingItem.current = buildItem(
      result.verdict === 'almost' ? 'almost' : 'incorrect',
      given,
    );
    setState((st) => ({
      ...st,
      phase: result.verdict === 'almost' ? 'almost' : 'incorrect',
      lastResult: result,
      streak: 0,
    }));
  }, [autoAdvanceMs, buildItem, commitItem, proceedAfterAnswer]);

  /** Accept the verdict, requeue the word so it comes round again, and move on. */
  const continueNext = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'incorrect' && s.phase !== 'almost') return;
    const item = pendingItem.current;
    if (item) {
      commitItem(item);
      // No cap: every miss — including a repeat of a word already retried —
      // sends it to the back of the queue again, so a word can never fall out
      // of the session unanswered correctly.
      if (s.current) requeue(s.current);
    }
    proceedAfterAnswer();
  }, [commitItem, proceedAfterAnswer, requeue]);

  /** The learner overrides the grader: count this answer as correct. */
  const markCorrect = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'incorrect' && s.phase !== 'almost') return;
    const item = pendingItem.current;
    if (item) commitItem({ ...item, outcome: 'correct', overridden: true });
    setState((st) => ({ ...st, streak: st.streak + 1 }));
    proceedAfterAnswer();
  }, [commitItem, proceedAfterAnswer]);

  /**
   * A learner going through the list quickly can press Enter a second time
   * during the brief "Correct" pause to jump straight to the next word,
   * instead of waiting out the full dwell time.
   */
  const skipDwell = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'correct') return;
    clearTimer();
    proceedAfterAnswer();
  }, [proceedAfterAnswer]);

  const useHint = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'prompt' || !s.current) return s;
      const answer = s.current.expected;
      const level = s.hintsUsedForCurrent + 1;
      // Reveal first `level` characters, then a masked remainder.
      const revealed = Array.from(answer).slice(0, level).join('');
      const remaining = Math.max(0, Array.from(answer).length - level);
      const hint = revealed + '·'.repeat(remaining);
      return { ...s, hintText: hint, hintsUsedForCurrent: level };
    });
  }, []);

  /**
   * Skip = "not now", never "not at all". The word always goes to the back of
   * the queue, with no cap, so a session can't end on a word that was never
   * actually answered.
   */
  const skip = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'prompt' || !s.current) return;
    commitItem(buildItem('skipped', s.input.trim()));
    requeue(s.current);
    proceedAfterAnswer();
  }, [buildItem, commitItem, proceedAfterAnswer, requeue]);

  const exit = useCallback(async (): Promise<StudySession> => {
    clearTimer();
    const endedAt = now();
    const items = itemsRef.current;
    // Mastery gained = new total mastery - baseline.
    const newTotalMastery = Array.from(statsMap.current.values()).reduce(
      (a, s) => a + s.mastery,
      0,
    );
    const masteryGained = newTotalMastery - masteryBaseline.current;
    const masteredNow = Array.from(statsMap.current.values()).filter(isMastered).length;
    const needReview = Array.from(statsMap.current.values()).filter(
      (s) => s.mastery < 0.5 && s.timesStudied > 0,
    ).length;

    const summary = computeSummary(
      items,
      sessionStart.current,
      endedAt,
      masteryGained,
      masteredNow,
      needReview,
    );

    const session: StudySession = {
      id: uid(),
      listId: config.listId,
      listName,
      startedAt: sessionStart.current,
      endedAt,
      direction: config.direction,
      order: config.order,
      items,
      summary,
      isReview,
    };
    await saveSession(session);
    await updateList(config.listId, { lastStudiedAt: endedAt });
    await recordActivity(endedAt, {
      studyMs: summary.durationMs,
      answers: summary.correct + summary.almost + summary.incorrect,
      correct: summary.correct,
      xp: summary.xp,
    });
    return session;
  }, [config, listName, isReview]);

  const progress =
    state.total > 0 ? Math.min(1, state.answeredCount / state.total) : 0;

  return {
    ...state,
    setInput,
    submit,
    continueNext,
    markCorrect,
    skipDwell,
    useHint,
    skip,
    exit,
    progress,
  };
}
