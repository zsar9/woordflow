import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/db/db';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDuration, gradeMeta } from '@/lib/format';
import { cn } from '@/lib/cn';

export function SessionReportPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const session = useLiveQuery(
    () => (sessionId ? db.sessions.get(sessionId) : undefined),
    [sessionId],
  );

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
  const totalAnswered = s.correct + s.almost + s.incorrect;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="mx-auto w-full max-w-lg text-center">
        {/* Hero: correct count, grade and percentage — and nothing else. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="eyebrow" style={{ color: '#A9633F' }}>
            {session.isReview ? 'Review complete' : 'Session complete'} · {formatDuration(s.durationMs)}
          </div>
          <div className="mt-4 font-serif text-7xl font-bold leading-tight text-ink sm:text-8xl">
            {s.correct}
            <span className="text-4xl font-medium text-subtle sm:text-5xl"> / {totalAnswered}</span>
          </div>
          <p className="mt-1 text-sm text-muted">correct</p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-3">
            <span
              className={cn(
                'text-3xl font-bold',
                gm.tone === 'success' && 'text-success',
                gm.tone === 'warning' && 'text-warning',
                gm.tone === 'danger' && 'text-danger',
              )}
            >
              {gm.letter}
            </span>
            <span className="h-6 w-px bg-border" />
            <span className="text-2xl font-semibold text-ink">{s.grade}%</span>
          </div>
          <p className="mt-2 text-sm text-muted">{session.listName}</p>
        </motion.div>

        {/* Actions */}
        <div className="mt-10 flex flex-col gap-2 sm:flex-row">
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
