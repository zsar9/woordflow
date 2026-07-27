import { useMemo } from 'react';
import type { DailyActivity } from '@/types';
import { localDateKey } from '@/db/repo';
import { formatDuration } from '@/lib/format';

/** GitHub-style contribution heatmap of study minutes over the last N weeks. */
export function Heatmap({
  activity,
  weeks = 20,
}: {
  activity: DailyActivity[];
  weeks?: number;
}) {
  const { columns, max } = useMemo(() => {
    const byDate = new Map(activity.map((a) => [a.date, a]));
    const days = weeks * 7;
    const today = new Date();
    // Align end to the end of the current week (Saturday).
    const cells: { date: string; value: number; act?: DailyActivity }[] = [];
    let max = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = localDateKey(d.getTime());
      const act = byDate.get(key);
      const value = act?.studyMs ?? 0;
      max = Math.max(max, value);
      cells.push({ date: key, value, act });
    }
    // Group into columns of 7 (weeks).
    const columns: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      columns.push(cells.slice(i, i + 7));
    }
    return { columns, max };
  }, [activity, weeks]);

  const level = (v: number) => {
    if (v === 0) return 0;
    const r = v / (max || 1);
    if (r > 0.66) return 4;
    if (r > 0.33) return 3;
    if (r > 0.1) return 2;
    return 1;
  };

  const levelClass = [
    'bg-elevated',
    'bg-brand/25',
    'bg-brand/45',
    'bg-brand/70',
    'bg-brand',
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${formatDuration(cell.value)}`}
                className={`h-3 w-3 rounded-sm ${levelClass[level(cell.value)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-subtle">
        <span>Less</span>
        {levelClass.map((c, i) => (
          <span key={i} className={`h-3 w-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
