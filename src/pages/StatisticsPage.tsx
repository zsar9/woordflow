import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '@/db/db';
import { Stat, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { Heatmap } from '@/features/stats/Heatmap';
import { useStreak } from '@/features/stats/useStreak';
import { chartColors } from '@/features/stats/chart';
import { isMastered, difficultyLabel } from '@/lib/srs';
import { formatDuration } from '@/lib/format';

export function StatisticsPage() {
  const streak = useStreak();

  const data = useLiveQuery(async () => {
    const [lists, words, stats, sessions, activity] = await Promise.all([
      db.lists.toArray(),
      db.words.toArray(),
      db.stats.toArray(),
      db.sessions.toArray(),
      db.activity.toArray(),
    ]);
    return { lists, words, stats, sessions, activity };
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;
    const { lists, words, stats, sessions, activity } = data;
    const studied = stats.filter((s) => s.timesStudied > 0);
    const mastered = stats.filter(isMastered).length;
    const totalStudyMs = activity.reduce((a, x) => a + x.studyMs, 0);
    const totalAnswers = activity.reduce((a, x) => a + x.answers, 0);

    // Accuracy & mastery over time from sessions (chronological).
    const chrono = sessions
      .filter((s) => s.summary)
      .sort((a, b) => a.startedAt - b.startedAt);
    const progression = chrono.map((s, i) => ({
      name: `#${i + 1}`,
      accuracy: s.summary!.accuracy,
      grade: s.summary!.grade,
    }));

    // Study time per day (last 14 days) for the area chart.
    const byDate = new Map(activity.map((a) => [a.date, a]));
    const dailyMinutes: { name: string; minutes: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const act = byDate.get(local);
      dailyMinutes.push({
        name: d.toLocaleDateString(undefined, { weekday: 'short' }),
        minutes: Math.round((act?.studyMs ?? 0) / 60000),
      });
      void key;
    }

    // Difficult words (top 8 by difficulty among studied).
    const wordById = new Map(words.map((w) => [w.id, w]));
    const hardest = studied
      .slice()
      .sort((a, b) => b.difficultyScore - a.difficultyScore)
      .slice(0, 8)
      .map((s) => ({ stat: s, word: wordById.get(s.wordId) }))
      .filter((x) => x.word);

    // Strongest / weakest lists by average mastery.
    const listMastery = lists
      .map((l) => {
        const ls = stats.filter((s) => s.listId === l.id);
        const m = ls.length ? ls.reduce((a, s) => a + s.mastery, 0) / ls.length : 0;
        return { list: l, mastery: m, count: ls.length };
      })
      .filter((x) => x.count > 0)
      .sort((a, b) => b.mastery - a.mastery);

    return {
      wordsLearned: studied.length,
      totalWords: words.length,
      mastered,
      totalStudyMs,
      totalAnswers,
      progression,
      dailyMinutes,
      hardest,
      listMastery,
      activity,
      hasData: sessions.length > 0 || totalStudyMs > 0,
    };
  }, [data]);

  if (!derived) {
    return <div className="py-20 text-center text-muted">Loading…</div>;
  }

  if (!derived.hasData) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Statistics</h1>
        <EmptyState
          icon={<Icon.Chart size={32} />}
          title="No study data yet"
          description="Complete a study session and your progress, accuracy, and streaks will show up here."
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Statistics</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Study time" value={formatDuration(derived.totalStudyMs)} />
        <Stat label="Answers" value={derived.totalAnswers} />
        <Stat
          label="Words learned"
          value={derived.wordsLearned}
          sub={`of ${derived.totalWords}`}
        />
        <Stat label="Mastered" value={derived.mastered} />
      </div>

      {/* Heatmap */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Study activity</h2>
          <span className="flex items-center gap-1.5 text-sm text-warning">
            <Icon.Flame size={16} /> {streak.current} day streak · longest {streak.longest}
          </span>
        </div>
        <Heatmap activity={derived.activity} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Accuracy / grade over time */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-medium text-ink">Accuracy over time</h2>
          {derived.progression.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={derived.progression} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.grid}`, borderRadius: 12, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="accuracy" stroke={chartColors.brand} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="grade" stroke={chartColors.success} strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </div>

        {/* Daily study minutes */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-medium text-ink">Study minutes · last 14 days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={derived.dailyMinutes} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillMin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.brand} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={chartColors.brand} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.grid}`, borderRadius: 12, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="minutes" stroke={chartColors.brand} strokeWidth={2} fill="url(#fillMin)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Most difficult words */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-medium text-ink">Most difficult words</h2>
          {derived.hardest.length === 0 ? (
            <ChartEmpty />
          ) : (
            <div className="space-y-1.5">
              {derived.hardest.map(({ stat, word }) => (
                <div key={stat.wordId} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink" dir="auto">
                    {word!.foreign}
                  </span>
                  <span className="truncate text-subtle" dir="auto">
                    {word!.native}
                  </span>
                  <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                    {difficultyLabel(stat.difficultyScore)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* List mastery ranking */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-medium text-ink">Strongest &amp; weakest lists</h2>
          <div className="space-y-2">
            {derived.listMastery.map((x) => (
              <div key={x.list.id} className="text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-ink">{x.list.name}</span>
                  <span className="tabular-nums text-subtle">{Math.round(x.mastery * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${x.mastery * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-subtle">
      Study more to see this chart.
    </div>
  );
}
