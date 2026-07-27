import { useEffect, useState } from 'react';
import type { Word, WordStat } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/primitives';
import { updateWord, toggleBookmark } from '@/db/repo';
import { difficultyLabel } from '@/lib/srs';
import { cn } from '@/lib/cn';

export function WordRow({
  word,
  stat,
  onDelete,
}: {
  word: Word;
  stat?: WordStat;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [foreign, setForeign] = useState(word.foreign);
  const [native, setNative] = useState(word.native);
  const [notes, setNotes] = useState(word.notes ?? '');

  useEffect(() => {
    setForeign(word.foreign);
    setNative(word.native);
    setNotes(word.notes ?? '');
  }, [word.foreign, word.native, word.notes]);

  const save = async () => {
    await updateWord(word.id, {
      foreign: foreign.trim() || word.foreign,
      native: native.trim() || word.native,
      notes: notes.trim() || undefined,
    });
    setEditing(false);
  };

  const mastery = stat?.mastery ?? 0;
  const diff = stat?.difficultyScore ?? 3;

  if (editing) {
    return (
      <div className="grid grid-cols-1 gap-2 border-b border-border px-3 py-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-brand"
          value={foreign}
          onChange={(e) => setForeign(e.target.value)}
          dir="auto"
          autoFocus
        />
        <input
          className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-brand"
          value={native}
          onChange={(e) => setNative(e.target.value)}
          dir="auto"
        />
        <input
          className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-brand"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="notes"
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={save}
            className="rounded-lg bg-success p-1.5 text-white transition hover:brightness-110"
            title="Save"
          >
            <Icon.Check size={15} />
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-border p-1.5 text-muted"
            title="Cancel"
          >
            <Icon.X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group grid grid-cols-[1fr_1fr_120px_auto] items-center gap-3 border-b border-border px-3 py-2.5 text-sm transition hover:bg-canvas">
      <div className="min-w-0">
        <div className="truncate text-ink" dir="auto">
          {word.foreign}
        </div>
        {word.notes && (
          <div className="truncate text-xs text-subtle">{word.notes}</div>
        )}
      </div>
      <div className="min-w-0 truncate text-muted" dir="auto">
        {word.native}
      </div>
      <div className="hidden sm:block">
        <div className="mb-1 flex items-center justify-between text-[11px] text-subtle">
          <span title={`Difficulty: ${difficultyLabel(diff)}`}>
            {stat && stat.timesStudied > 0 ? difficultyLabel(diff) : 'New'}
          </span>
          <span className="tabular-nums">{Math.round(mastery * 100)}%</span>
        </div>
        <ProgressBar
          value={mastery}
          tone={mastery >= 0.8 ? 'success' : mastery >= 0.4 ? 'brand' : 'warning'}
        />
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => toggleBookmark(word.id)}
          className={cn(
            'rounded-lg p-1.5 transition',
            word.bookmarked ? 'text-warning' : 'text-subtle opacity-0 group-hover:opacity-100 hover:text-ink',
          )}
          title="Bookmark"
        >
          <Icon.Star size={15} />
        </button>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg p-1.5 text-subtle opacity-0 transition hover:text-ink group-hover:opacity-100"
          title="Edit"
        >
          <Icon.Edit size={15} />
        </button>
        <button
          onClick={() => onDelete(word.id)}
          className="rounded-lg p-1.5 text-subtle opacity-0 transition hover:text-danger group-hover:opacity-100"
          title="Delete"
        >
          <Icon.Trash size={15} />
        </button>
      </div>
    </div>
  );
}
