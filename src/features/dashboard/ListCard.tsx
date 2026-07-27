import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ListSummary } from './useLibrary';
import { Icon } from '@/components/ui/Icon';
import { Badge, ProgressBar } from '@/components/ui/primitives';
import { relativeTime, pluralize, gradeMeta } from '@/lib/format';
import { cn } from '@/lib/cn';

export function ListCard({ summary }: { summary: ListSummary }) {
  const navigate = useNavigate();
  const { list } = summary;
  const masteryPct = Math.round(summary.mastery * 100);
  const grade = summary.lastGrade;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => navigate(`/list/${list.id}`)}
          className="min-w-0 text-left"
        >
          <h3 className="truncate text-[15px] font-semibold text-ink group-hover:text-brand">
            {list.name}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
            <span>{list.language}</span>
            <span>·</span>
            <span>{pluralize(summary.wordCount, 'word')}</span>
          </div>
        </button>
        {grade != null && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
              gradeMeta(grade).tone === 'success' && 'bg-success/10 text-success',
              gradeMeta(grade).tone === 'warning' && 'bg-warning/10 text-warning',
              gradeMeta(grade).tone === 'danger' && 'bg-danger/10 text-danger',
            )}
            title={`Last grade ${grade}%`}
          >
            {gradeMeta(grade).letter}
          </span>
        )}
      </div>

      {/* Mastery */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted">Mastery</span>
          <span className="font-medium tabular-nums text-ink">{masteryPct}%</span>
        </div>
        <ProgressBar
          value={summary.mastery}
          tone={masteryPct >= 80 ? 'success' : masteryPct >= 40 ? 'brand' : 'warning'}
        />
      </div>

      {/* Meta chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {summary.dueCount > 0 && (
          <Badge tone="brand">{summary.dueCount} due</Badge>
        )}
        {summary.difficultCount > 0 && (
          <Badge tone="warning">{summary.difficultCount} hard</Badge>
        )}
        {summary.masteredCount > 0 && (
          <Badge tone="success">{summary.masteredCount} mastered</Badge>
        )}
        {summary.avgGrade > 0 && (
          <Badge tone="muted">avg {summary.avgGrade}%</Badge>
        )}
      </div>

      <div className="mt-1.5 text-[11px] text-subtle">
        Last studied {relativeTime(summary.lastStudiedAt)}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <button
          onClick={() => navigate(`/study/${list.id}`)}
          disabled={summary.wordCount === 0}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
        >
          <Icon.Play size={15} />
          {summary.hasProgress ? 'Continue' : 'Study'}
        </button>
        <button
          onClick={() => navigate(`/study/${list.id}?mode=review`)}
          title="Review mistakes"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:text-danger"
        >
          <Icon.Flame size={16} />
        </button>
        <button
          onClick={() => navigate(`/list/${list.id}`)}
          title="Open list & statistics"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:text-ink"
        >
          <Icon.Chart size={16} />
        </button>
      </div>
    </motion.div>
  );
}
