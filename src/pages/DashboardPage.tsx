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
import { EmptyState, Stat } from '@/components/ui/primitives';
import { useStreak } from '@/features/stats/useStreak';
import { downloadBackup, restoreBackup } from '@/lib/export';
import { useToast } from '@/components/ui/Toast';

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

  const totals = useMemo(() => {
    let words = 0;
    let due = 0;
    let mastered = 0;
    for (const s of summaries.values()) {
      words += s.wordCount;
      due += s.dueCount;
      mastered += s.masteredCount;
    }
    return { words, due, mastered };
  }, [summaries]);

  const handleRestore = async (file: File) => {
    try {
      await restoreBackup(await file.text());
      toast.push('Backup restored', 'success');
    } catch (e) {
      toast.push((e as Error).message, 'danger');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">
            {streak.studiedToday
              ? "You've studied today — nice."
              : 'Pick a list and keep your streak alive.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button size="sm" variant="ghost" onClick={() => restoreRef.current?.click()}>
            <Icon.Import size={15} /> Restore
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void downloadBackup()}>
            <Icon.Export size={15} /> Backup
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowImport(true)}>
            <Icon.Import size={15} /> Import
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowNewFolder(true)}>
            <Icon.Folder size={15} /> Folder
          </Button>
          <Button size="sm" variant="primary" onClick={() => setShowNewList(true)}>
            <Icon.Plus size={15} /> New list
          </Button>
        </div>
      </div>

      {/* Top stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Lists" value={lists.length} />
        <Stat label="Words" value={totals.words} />
        <Stat label="Due now" value={totals.due} sub="ready for review" />
        <Stat
          label="Streak"
          value={
            <span className="flex items-center gap-1.5">
              <Icon.Flame size={20} className="text-warning" />
              {streak.current}
            </span>
          }
          sub={`longest ${streak.longest}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Folder tree */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-2">
            <FolderTree
              folders={folders}
              lists={lists}
              selected={selectedFolder}
              onSelect={setSelectedFolder}
            />
          </div>
        </aside>

        {/* Grid */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-2xl border border-border bg-surface"
                />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleLists.map((list) => {
                const summary = summaries.get(list.id);
                return summary ? <ListCard key={list.id} summary={summary} /> : null;
              })}
            </div>
          )}
        </div>
      </div>

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
