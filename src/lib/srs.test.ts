import { describe, it, expect } from 'vitest';
import { applyReview, initialStat, isDue, isMastered } from './srs';

const t0 = 1_700_000_000_000;

describe('srs', () => {
  it('grows interval on repeated correct answers', () => {
    let s = initialStat('w1', 'l1');
    s = applyReview(s, { outcome: 'correct', responseMs: 1000, hintsUsed: 0, charsTyped: 5, now: t0 });
    expect(s.reps).toBe(1);
    expect(s.intervalDays).toBeGreaterThanOrEqual(1);
    const i1 = s.intervalDays;
    s = applyReview(s, { outcome: 'correct', responseMs: 1000, hintsUsed: 0, charsTyped: 5, now: t0 });
    s = applyReview(s, { outcome: 'correct', responseMs: 1000, hintsUsed: 0, charsTyped: 5, now: t0 });
    expect(s.intervalDays).toBeGreaterThan(i1);
    expect(s.correct).toBe(3);
  });

  it('resets interval on incorrect', () => {
    let s = initialStat('w1', 'l1');
    s = applyReview(s, { outcome: 'correct', responseMs: 1000, hintsUsed: 0, charsTyped: 5, now: t0 });
    s = applyReview(s, { outcome: 'incorrect', responseMs: 1000, hintsUsed: 0, charsTyped: 5, now: t0 });
    expect(s.reps).toBe(0);
    expect(s.intervalDays).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(isDue(s, t0)).toBe(true);
  });

  it('tracks streaks and mastery upward', () => {
    let s = initialStat('w1', 'l1');
    for (let i = 0; i < 6; i++) {
      s = applyReview(s, { outcome: 'correct', responseMs: 800, hintsUsed: 0, charsTyped: 5, confidence: 'very-easy', now: t0 });
    }
    expect(s.longestStreak).toBe(6);
    expect(s.mastery).toBeGreaterThan(0.7);
    expect(isMastered(s)).toBe(true);
  });

  it('hints shrink the interval', () => {
    let a = initialStat('w1', 'l1');
    let b = initialStat('w2', 'l1');
    for (let i = 0; i < 3; i++) {
      a = applyReview(a, { outcome: 'correct', responseMs: 800, hintsUsed: 0, charsTyped: 5, now: t0 });
      b = applyReview(b, { outcome: 'correct', responseMs: 800, hintsUsed: 1, charsTyped: 5, now: t0 });
    }
    expect(b.intervalDays).toBeLessThanOrEqual(a.intervalDays);
    expect(b.hintsUsed).toBe(3);
  });
});
