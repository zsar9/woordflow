/** Presentation helpers for numbers, durations, dates, grades. */

export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function relativeTime(ts?: number): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const abs = Math.abs(diff);
  const min = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (abs < min) return 'just now';
  if (abs < hour) return `${Math.round(abs / min)}m ago`;
  if (abs < day) return `${Math.round(abs / hour)}h ago`;
  if (abs < day * 7) return `${Math.round(abs / day)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatPercent(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`;
}

/** Map a 0..100 grade to a letter + color token. */
export function gradeMeta(grade: number): { letter: string; tone: string } {
  if (grade >= 90) return { letter: 'A', tone: 'success' };
  if (grade >= 80) return { letter: 'B', tone: 'success' };
  if (grade >= 70) return { letter: 'C', tone: 'warning' };
  if (grade >= 55) return { letter: 'D', tone: 'warning' };
  return { letter: 'F', tone: 'danger' };
}

/** Dutch-style 1–10 grade some users prefer, derived from accuracy. */
export function dutchGrade(accuracy0to100: number): number {
  // 0% -> 1.0, 100% -> 10.0, clamped.
  const g = 1 + (accuracy0to100 / 100) * 9;
  return Math.round(g * 10) / 10;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? `${singular}s`)}`;
}
