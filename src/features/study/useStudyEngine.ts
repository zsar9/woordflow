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
  | 'correct' // showed correct feedback, auto-advancing
  | 'incorrect' // showed the right answer, awaiting continue
  | 'almost' // near-miss, awaiting Y/N
  | 'confidence' // asking confidence after a correct answer
  | 'done';

export interface EngineState {
  phase: Phase;
  index: number; // pointer into the (growing) queue
  total: number; // planned total for progress display
  answeredCount: number;
  current?: Question;
  input: string;
  streak: number;
  lastResult?: GradeResult;
  hintText: string;
  hintsUsedForCurrent: number;
}

export interface StudyEngine extends EngineState {
  setInput: (v: string) => void;
  submit: () => void;
  continueNext: () => void; // Space/Enter after incorrect
  confirmAlmost: (asCorrect: boolean) => void; // Y / N
  useHint: () => void;
  skip: () => void;
  rateConfidence: (c: Confidence) => void;
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
  askConfidence: boolean;
}

/** Grade config derived from a session config. */
function gradeConfig(config: SessionConfig) {
  return { forgiveness: config.forgiveness, enableFuzzy: config.enableFuzzy };
}

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
  const {
    words,
    stats,
    config,
    listName,
    isReview,
    autoAdvanceMs,
    askConfidence,
  } = args;

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
  const plannedTotal = useRef(initialQueue.length);
  const masteryBaseline = useRef(
    stats.reduce((acc, s) => acc + s.mastery, 0),
  );
  const pendingConfidenceItem = useRef<SessionItem | null>(null);

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
    (wordId: string, outcome: AnswerOutcome, responseMs: number, hints: number, charsTyped: number, confidence?: Confidence) => {
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

  const goToIndex = useCallback((nextIndex: number) => {
    clearTimer();
    const q = queueRef.current[nextIndex];
    questionStart.current = now();
    if (!q) {
      setState((s) => ({ ...s, phase: 'done' }));
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
      total: Math.max(plannedTotal.current, queueRef.current.length),
    }));
  }, []);

  const recordItem = useCallback(
    (outcome: AnswerOutcome, given: string, overridden?: boolean): SessionItem => {
      const s = stateRef.current;
      const q = s.current!;
      const responseMs = now() - questionStart.current;
      const item: SessionItem = {
        wordId: q.word.id,
        direction: q.direction,
        prompt: q.prompt,
        expected: q.expected,
        given,
        outcome,
        responseMs,
        hintsUsed: s.hintsUsedForCurrent,
        overridden,
      };
      return item;
    },
    [],
  );

  const finishItem = useCallback(
    (item: SessionItem, confidence?: Confidence) => {
      itemsRef.current.push(item);
      applyStat(
        item.wordId,
        item.outcome,
        item.responseMs,
        item.hintsUsed,
        item.given.length,
        confidence,
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
    if (!given) return;
    const result = gradeAnswer(given, s.current.accepted, gradeConfig(config));

    if (result.verdict === 'correct') {
      const item = recordItem('correct', given);
      if (askConfidence) {
        pendingConfidenceItem.current = item;
        setState((st) => ({ ...st, phase: 'confidence', lastResult: result, streak: st.streak + 1 }));
      } else {
        finishItem(item);
        setState((st) => ({ ...st, phase: 'correct', lastResult: result, streak: st.streak + 1 }));
        advanceTimer.current = setTimeout(proceedAfterAnswer, Math.max(150, autoAdvanceMs));
      }
    } else if (result.verdict === 'almost') {
      setState((st) => ({ ...st, phase: 'almost', lastResult: result }));
    } else {
      const item = recordItem('incorrect', given);
      finishItem(item);
      setState((st) => ({ ...st, phase: 'incorrect', lastResult: result, streak: 0 }));
    }
  }, [config, askConfidence, autoAdvanceMs, recordItem, finishItem, proceedAfterAnswer]);

  const confirmAlmost = useCallback(
    (asCorrect: boolean) => {
      const s = stateRef.current;
      if (s.phase !== 'almost') return;
      const given = s.input.trim();
      if (asCorrect) {
        const item = recordItem('correct', given, true);
        if (askConfidence) {
          pendingConfidenceItem.current = item;
          setState((st) => ({ ...st, phase: 'confidence', streak: st.streak + 1 }));
          return;
        }
        finishItem(item);
        setState((st) => ({ ...st, phase: 'correct', streak: st.streak + 1 }));
        advanceTimer.current = setTimeout(proceedAfterAnswer, Math.max(150, autoAdvanceMs));
      } else {
        const item = recordItem('almost', given, true);
        finishItem(item);
        setState((st) => ({ ...st, phase: 'incorrect', streak: 0 }));
      }
    },
    [askConfidence, autoAdvanceMs, recordItem, finishItem, proceedAfterAnswer],
  );

  const rateConfidence = useCallback(
    (c: Confidence) => {
      const item = pendingConfidenceItem.current;
      if (!item) return;
      pendingConfidenceItem.current = null;
      item.confidence = c;
      finishItem(item, c);
      proceedAfterAnswer();
    },
    [finishItem, proceedAfterAnswer],
  );

  const continueNext = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'incorrect') return;
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

  const skip = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'prompt' || !s.current) return;
    // Record a skip item (counted, no schedule change) and requeue for later.
    const item = recordItem('skipped', s.input.trim());
    finishItem(item);
    // Re-insert the same word a few positions later so it returns this session.
    const q = s.current;
    const insertAt = Math.min(queueRef.current.length, s.index + 4);
    queueRef.current.splice(insertAt, 0, buildQuestion(q.word, q.direction));
    plannedTotal.current = queueRef.current.length;
    proceedAfterAnswer();
  }, [recordItem, finishItem, proceedAfterAnswer]);

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
    confirmAlmost,
    useHint,
    skip,
    rateConfidence,
    exit,
    progress,
  };
}
