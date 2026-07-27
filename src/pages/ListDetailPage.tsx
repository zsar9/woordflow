import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  addWord,
  deleteList,
  deleteWord,
  duplicateList,
  updateList,
} from '@/db/repo';
import { WordRow } from '@/features/lists/WordRow';
import { ImportModal } from '@/features/import/ImportModal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Stat, EmptyState, inputClass } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';
import { exportListCsv, exportListJson } from '@/lib/export';
import { normalize } from '@/lib/text';
import { isMastered } from '@/lib/srs';
import { useToast } from '@/components/ui/Toast';
import { relativeTime } from '@/lib/format';

export function ListDetailPage() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [newForeign, setNewForeign] = useState('');
  const [newNative, setNewNative] = useState('');

  const data = useLiveQuery(async () => {
    if (!listId) return null;
    const [list, words, stats] = await Promise.all([
      db.lists.get(listId),
      db.words.where('listId').equals(listId).sortBy('order'),
      db.stats.where('listId').equals(listId).toArray(),
    ]);
    return { list, words, stats };
  }, [listId]);

  const statsById = useMemo(
    () => new Map((data?.stats ?? []).map((s) => [s.wordId, s])),
    [data?.stats],
  );

  const filteredWords = useMemo(() => {
    const words = data?.words ?? [];
    if (!query.trim()) return words;
    const needle = normalize(query);
    return words.filter((w) =>
      normalize(`${w.foreign} ${w.native} ${w.notes ?? ''}`).includes(needle),
    );
  }, [data?.words, query]);

  const aggregate = useMemo(() => {
    const stats = data?.stats ?? [];
    const mastery = stats.length
      ? stats.reduce((a, s) => a + s.mastery, 0) / stats.length
      : 0;
    const due = stats.filter((s) => s.dueAt <= Date.now() && s.timesStudied > 0).length;
    const mastered = stats.filter(isMastered).length;
    return { mastery, due, mastered };
  }, [data?.stats]);

  if (data === undefined) {
    return <div className="py-20 text-center text-muted">Loading…</div>;
  }
  if (!data || !data.list) {
    return (
      <div className="py-20 text-center text-muted">
        List not found.{' '}
        <button className="text-brand" onClick={() => navigate('/')}>
          Go home
        </button>
      </div>
    );
  }
  const list = data.list;

  const addNewWord = async () => {
    if (!newForeign.trim() || !newNative.trim()) return;
    await addWord(list.id, { foreign: newForeign.trim(), native: newNative.trim() });
    setNewForeign('');
    setNewNative('');
    toast.push('Word added', 'success');
  };

  const saveName = async () => {
    if (nameDraft.trim()) await updateList(list.id, { name: nameDraft.trim() });
    setEditingName(false);
  };

  return (
    <div>
      {/* Breadcrumb + title */}
      <button
        onClick={() => navigate('/')}
        className="mb-3 flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <Icon.Back size={16} /> Dashboard
      </button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className={inputClass + ' text-lg font-semibold'}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                onBlur={saveName}
              />
            </div>
          ) : (
            <h1
              className="cursor-text text-2xl font-semibold tracking-tight text-ink"
              onClick={() => {
                setNameDraft(list.name);
                setEditingName(true);
              }}
              title="Click to rename"
            >
              {list.name}
            </h1>
          )}
          <p className="mt-0.5 text-sm text-muted">
            {list.language} → {list.nativeLanguage} · {data.words.length} words · last studied{' '}
            {relativeTime(list.lastStudiedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/study/${list.id}?mode=review`)}>
            <Icon.Flame size={15} /> Review
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/study/${list.id}`)}>
            <Icon.Play size={15} /> Study
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Words" value={data.words.length} />
        <Stat label="Mastery" value={`${Math.round(aggregate.mastery * 100)}%`} />
        <Stat label="Due now" value={aggregate.due} />
        <Stat label="Mastered" value={aggregate.mastered} />
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            className={inputClass + ' pl-9'}
            placeholder="Search words in this list…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
          <Icon.Import size={15} /> Import
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void exportListCsv(list.id)}>
          <Icon.Export size={15} /> CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void exportListJson(list.id)}>
          JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            const copy = await duplicateList(list.id);
            if (copy) {
              toast.push('List duplicated', 'success');
              navigate(`/list/${copy.id}`);
            }
          }}
        >
          <Icon.Copy size={15} /> Duplicate
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)}>
          <Icon.Trash size={15} />
        </Button>
      </div>

      {/* Add word */}
      <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <input
          className={inputClass}
          placeholder={`Word in ${list.language}`}
          value={newForeign}
          onChange={(e) => setNewForeign(e.target.value)}
          dir="auto"
          onKeyDown={(e) => e.key === 'Enter' && addNewWord()}
        />
        <input
          className={inputClass}
          placeholder={`Translation in ${list.nativeLanguage}`}
          value={newNative}
          onChange={(e) => setNewNative(e.target.value)}
          dir="auto"
          onKeyDown={(e) => e.key === 'Enter' && addNewWord()}
        />
        <Button variant="primary" onClick={addNewWord}>
          <Icon.Plus size={16} /> Add
        </Button>
      </div>

      {/* Word list */}
      {data.words.length === 0 ? (
        <EmptyState
          icon={<Icon.Book size={30} />}
          title="No words yet"
          description="Add words above or import them from a file or paste."
          action={
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <Icon.Import size={15} /> Import words
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-[1fr_1fr_120px_auto] gap-3 border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
            <span>{list.language}</span>
            <span>{list.nativeLanguage}</span>
            <span className="hidden sm:block">Mastery</span>
            <span></span>
          </div>
          {filteredWords.map((w) => (
            <WordRow key={w.id} word={w} stat={statsById.get(w.id)} onDelete={deleteWord} />
          ))}
          {filteredWords.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-subtle">
              No words match “{query}”.
            </div>
          )}
        </div>
      )}

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        targetListId={list.id}
        onDone={(n) => toast.push(`Added ${n} words`, 'success')}
      />

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete list?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteList(list.id);
                toast.push('List deleted');
                navigate('/');
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This deletes <span className="font-medium text-ink">{list.name}</span> and all{' '}
          {data.words.length} words, their statistics, and session history. This can't be
          undone.
        </p>
      </Modal>
    </div>
  );
}
