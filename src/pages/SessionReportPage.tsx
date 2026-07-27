import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/db/db';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Stat } from '@/components/ui/primitives';
import { formatDuration, formatMs, gradeMeta, dutchGrade } from '@/lib/format';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { chartColors } from '@/features/stats/chart';

export function SessionReportPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const session = useLiveQuery(
    () => (sessionId ? db.sessions.get(sessionId) : undefined),
    [sessionId],
  );
  const recent = useLiveQuery(async () => {
    if (!session) return [];
    return db.sessions
      .where('listId')
      .equals(session.listId)
      .and((s) => !!s.summary)
      .reverse()
      .sortBy('startedAt');
  }, [session?.listId]);

  const mistakes = useMemo(
    () =>
      session?.items.filter(
        (i) => i.outcome === 'incorrect' || i.outcome === 'almost',
      ) ?? [],
    [session],
  );

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
      </div>
    );
  }
  if (!session || !session.summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-muted">
        Session not found.
      </div>
    );
  }

  const s = session.summary;
  const gm = gradeMeta(s.grade);
  const tone =
    gm.tone === 'success' ? '#16a37a' : gm.tone === 'warning' ? '#ca8a04' : '#dc4444';

  const historyData = (recent ?? [])
    .slice()
    .reverse()
    .slice(-12)
    .map((sess, i) => ({
      name: `#${i + 1}`,
      grade: sess.summary!.grade,
      current: sess.id === session.id,
    }));

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <div
            className="flex h-24 w-24 items-center justify-center rounded-3xl text-5xl font-bold text-white shadow-pop"
            style={{ backgroundColor: tone }}
          >
            {gm.letter}
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            {s.grade}% · {session.isReview ? 'Review complete' : 'Session complete'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {session.listName} · Dutch grade {dutchGrade(s.accuracy).toFixed(1)} · +{s.xp} XP
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Accuracy" value={`${s.accuracy}%`} />
          <Stat label="Correct" value={s.correct} sub={`of ${s.correct + s.almost + s.incorrect}`} />
          <Stat label="Almost" value={s.almost} />
          <Stat label="Incorrect" value={s.incorrect} />
          <Stat label="Skipped" value={s.skipped} />
          <Stat label="Longest streak" value={s.longestStreak} />
          <Stat label="Avg time" value={formatMs(s.avgResponseMs)} />
          <Stat label="Fastest" value={formatMs(s.fastestMs)} />
          <Stat label="Duration" value={formatDuration(s.durationMs)} />
          <Stat label="Words mastered" value={s.wordsMastered} />
          <Stat label="Need review" value={s.wordsNeedingReview} />
          <Stat label="Mastery gained" value={`+${(s.masteryGained * 100).toFixed(0)}%`} />
        </div>

        {/* History chart */}
        {historyData.length > 1 && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 text-sm font-medium text-ink">
              Grade vs. previous sessions
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={historyData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(127,127,127,0.08)' }}
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.grid}`,
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="grade" radius={[6, 6, 0, 0]}>
                  {historyData.map((d, i) => (
                    <Cell key={i} fill={d.current ? chartColors.brand : chartColors.muted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Mistakes */}
        {mistakes.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">
                Words to review ({mistakes.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {mistakes.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-canvas px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-ink" dir="auto">
                    {m.prompt}
                  </span>
                  <span className="text-subtle">→</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink" dir="auto">
                    {m.expected}
                  </span>
                  <span
                    className={
                      'shrink-0 text-xs ' +
                      (m.outcome === 'almost' ? 'text-warning' : 'text-danger')
                    }
                    dir="auto"
                  >
                    you: {m.given || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          {mistakes.length > 0 && !session.isReview && (
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => navigate(`/study/${session.listId}?mode=review`)}
            >
              <Icon.Flame size={17} /> Review {mistakes.length} mistakes
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => navigate(`/study/${session.listId}`)}
          >
            <Icon.Play size={16} /> Study again
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="flex-1"
            onClick={() => navigate(`/list/${session.listId}`)}
          >
            Back to list
          </Button>
        </div>
      </div>
    </div>
  );
}
