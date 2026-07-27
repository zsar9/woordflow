import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '@/features/dashboard/useLibrary';
import { descendantFolderIds } from '@/features/dashboard/tree';
import { FolderTree } from '@/features/dashboard/FolderTree';
import { ListCard } from '@/features/dashboard/ListCard';
import { NewListModal, NewFolderModal } from '@/features/dashboard/CreateModals';
import { ImportModal } from '@/features/import/ImportModal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, Eyebrow } from '@/components/ui/primitives';
import { useStreak } from '@/features/stats/useStreak';
import { downloadBackup, restoreBackup } from '@/lib/export';
import { useToast } from '@/components/ui/Toast';
import { languageAccent } from '@/lib/languageColor';
import { pluralize } from '@/lib/format';

export function DashboardPage() {
  const { folders, lists, summaries, loading } = useLibrary();
  const streak = useStreak();
  const navigate = useNavigate();
  const toast = useToast();
  const restoreRef = useRef<HTMLInputElement>(null);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFolders, setShowFolders] = useState(false);

  const visibleLists = useMemo(() => {
    let ls = lists;
    if (selectedFolder) {
      const ids = descendantFolderIds(folders, selectedFolder);
      ls = lists.filter((l) => l.folderId && ids.has(l.folderId));
    }
    return ls
      .filter((l) => !l.archived)
      .sort((a, b) => (b.lastStudiedAt ?? 0) - (a.lastStudiedAt ?? 0) || a.order - b.order);
  }, [lists, folders, selectedFolder]);

  // Per-language due-word pills for the banner ("24 Spanish · 13 French · 5 Darija").
  const dueByLanguage = useMemo(() => {
    const byLang = new Map<string, number>();
    for (const s of summaries.values()) {
      if (s.dueCount > 0) byLang.set(s.list.language, (byLang.get(s.list.language) ?? 0) + s.dueCount);
    }
    return Array.from(byLang.entries()).sort((a, b) => b[1] - a[1]);
  }, [summaries]);

  const totalDue = dueByLanguage.reduce((a, [, n]) => a + n, 0);
  const estMinutes = Math.max(1, Math.round(totalDue * 0.25));

  const handleRestore = async (file: File) => {
    try {
      await restoreBackup(await file.text());
      toast.push('Backup restored', 'success');
    } catch (e) {
      toast.push((e as Error).message, 'danger');
    }
  };

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <div>
      <p className="mb-1 text-sm text-muted">
        {streak.studiedToday ? "You've studied today — nice." : 'Pick a list and keep your streak alive.'}
      </p>
      <h1 className="mb-6 text-3xl text-ink">Dashboard</h1>

      {/* Due banner */}
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-border bg-gradient-to-br from-brand-soft/60 to-transparent p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Eyebrow>
            {today} · {streak.current} day streak
          </Eyebrow>
          <h2 className="mt-1 font-serif text-4xl text-ink">
            {totalDue > 0 ? `${totalDue} words are due.` : 'Nothing due — study ahead?'}
          </h2>
          {dueByLanguage.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {dueByLanguage.map(([lang, n]) => {
                const accent = languageAccent(lang);
                return (
                  <span key={lang} className="flex items-center gap-1.5 text-sm text-muted">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: accent.hex }}
                    />
                    {n} {lang}
                  </span>
                );
              })}
              <span className="text-sm text-subtle">about {estMinutes} minutes</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => setShowFolders((v) => !v)}>
            Pick a list
          </Button>
          <Button
            variant="primary"
            disabled={totalDue === 0}
            onClick={() => {
              const withDue = visibleLists.find((l) => (summaries.get(l.id)?.dueCount ?? 0) > 0);
              if (withDue) navigate(`/study/${withDue.id}`);
            }}
          >
            Study all due
          </Button>
        </div>
      </div>

      {showFolders && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-2">
          <FolderTree
            folders={folders}
            lists={lists}
            selected={selectedFolder}
            onSelect={setSelectedFolder}
          />
        </div>
      )}

      {/* Library table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : visibleLists.length === 0 ? (
        <EmptyState
          icon={<Icon.Book size={32} />}
          title="No lists here yet"
          description="Create a list or import words from CSV, Excel, or a paste."
          action={
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setShowNewList(true)}>
                <Icon.Plus size={15} /> New list
              </Button>
              <Button variant="secondary" onClick={() => setShowImport(true)}>
                <Icon.Import size={15} /> Import
              </Button>
            </div>
          }
        />
      ) : (
        <div className="rounded-2xl border border-border bg-surface px-4">
          <div className="flex items-center gap-4 border-b border-border py-2.5 text-[11px] font-medium uppercase tracking-wide text-subtle">
            <span className="w-[3px]" />
            <span className="flex-1">List</span>
            <span className="hidden w-16 shrink-0 text-right sm:block">Words</span>
            <span className="w-10 shrink-0 text-right">Due</span>
            <span className="hidden w-28 shrink-0 md:block">Mastery</span>
            <span className="hidden w-24 shrink-0 text-right lg:block">Last studied</span>
          </div>
          {visibleLists.map((list) => {
            const summary = summaries.get(list.id);
            return summary ? <ListCard key={list.id} summary={summary} /> : null;
          })}
        </div>
      )}

      {/* Footer: create/import + backup */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <button
            onClick={() => setShowNewList(true)}
            className="text-muted underline decoration-border underline-offset-4 transition hover:text-ink"
          >
            New list
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            className="text-muted underline decoration-border underline-offset-4 transition hover:text-ink"
          >
            New folder
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="text-muted underline decoration-border underline-offset-4 transition hover:text-ink"
          >
            Import CSV, Excel or paste
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-subtle">
          <span>Stored on this device only</span>
          <input
            ref={restoreRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleRestore(f);
            }}
          />
          <button onClick={() => restoreRef.current?.click()} className="underline underline-offset-4 hover:text-ink">
            Restore
          </button>
          <button onClick={() => void downloadBackup()} className="underline underline-offset-4 hover:text-ink">
            Backup
          </button>
        </div>
      </div>

      {visibleLists.length > 0 && (
        <p className="mt-8 text-xs text-subtle">
          {pluralize(lists.length, 'list')} ·{' '}
          {pluralize(
            Array.from(summaries.values()).reduce((a, s) => a + s.wordCount, 0),
            'word',
          )}
        </p>
      )}

      <NewListModal
        open={showNewList}
        onClose={() => setShowNewList(false)}
        folders={folders}
        defaultFolderId={selectedFolder}
        onCreated={(id) => navigate(`/list/${id}`)}
      />
      <NewFolderModal
        open={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        folders={folders}
        defaultParentId={selectedFolder}
      />
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onDone={(_, id) => navigate(`/list/${id}`)}
      />
    </div>
  );
}
