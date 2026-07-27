import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { localDateKey } from '@/db/repo';

export interface StreakInfo {
  current: number;
  longest: number;
  studiedToday: boolean;
}

/** Compute daily study streaks from the activity table. */
export function useStreak(): StreakInfo {
  const activity = useLiveQuery(() => db.activity.toArray(), [], []);

  const dates = new Set(
    (activity ?? []).filter((a) => a.answers > 0).map((a) => a.date),
  );

  const today = localDateKey(Date.now());
  const yesterday = localDateKey(Date.now() - 86_400_000);
  const studiedToday = dates.has(today);

  // Current streak: count back from today (or yesterday if not yet studied today).
  let current = 0;
  let cursor = studiedToday ? Date.now() : Date.now() - 86_400_000;
  if (studiedToday || dates.has(yesterday)) {
    while (dates.has(localDateKey(cursor))) {
      current++;
      cursor -= 86_400_000;
    }
  }

  // Longest streak across all recorded days.
  const sorted = Array.from(dates).sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const t = new Date(d + 'T00:00:00').getTime();
    if (prev !== null && Math.round((t - prev) / 86_400_000) === 1) run++;
    else run = 1;
    longest = Math.max(longest, run);
    prev = t;
  }

  return { current, longest, studiedToday };
}
