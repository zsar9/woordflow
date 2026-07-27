import { useNavigate } from 'react-router-dom';
import type { ListSummary } from './useLibrary';
import { relativeTime, pluralize } from '@/lib/format';
import { languageAccent } from '@/lib/languageColor';
import { cn } from '@/lib/cn';

/** One row of the Atlas library table: List / Words / Due / Mastery / Last studied. */
export function ListCard({ summary }: { summary: ListSummary }) {
  const navigate = useNavigate();
  const { list } = summary;
  const masteryPct = Math.round(summary.mastery * 100);
  const accent = languageAccent(list.language);
  const resting = summary.wordCount > 0 && summary.dueCount === 0;

  return (
    <button
      onClick={() => navigate(`/list/${list.id}`)}
      className="group flex w-full items-center gap-4 border-b border-border py-4 text-left last:border-b-0"
    >
      <span
        className="h-9 w-[3px] shrink-0 rounded-full"
        style={{ backgroundColor: accent.hex, opacity: resting ? 0.35 : 1 }}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[15px] font-medium group-hover:underline',
            resting ? 'text-subtle' : 'text-ink',
          )}
        >
          {list.name}
        </span>
        <span className="block truncate text-xs text-subtle">
          {resting ? `rests until reviewed` : list.language}
        </span>
      </span>

      <span className="hidden w-16 shrink-0 text-right tabular-nums text-sm text-muted sm:block">
        {summary.wordCount}
      </span>
      <span
        className="w-10 shrink-0 text-right tabular-nums text-sm font-medium"
        style={{ color: summary.dueCount > 0 ? accent.hex : undefined }}
      >
        {summary.dueCount > 0 ? summary.dueCount : '—'}
      </span>
      <span className="hidden w-28 shrink-0 items-center gap-2 md:flex">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
          <span
            className="block h-full rounded-full"
            style={{ width: `${masteryPct}%`, backgroundColor: accent.hex }}
          />
        </span>
      </span>
      <span className="hidden w-24 shrink-0 text-right text-xs text-subtle lg:block">
        {relativeTime(summary.lastStudiedAt)}
      </span>
    </button>
  );
}

export function listDueLabel(summary: ListSummary): string {
  return pluralize(summary.dueCount, 'word due', 'words due');
}
