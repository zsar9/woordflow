import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { normalize } from '@/lib/text';
import { cn } from '@/lib/cn';

interface Hit {
  type: 'list' | 'word' | 'folder';
  id: string;
  listId?: string;
  title: string;
  subtitle: string;
}

export function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  const data = useLiveQuery(async () => {
    const [folders, lists, words] = await Promise.all([
      db.folders.toArray(),
      db.lists.toArray(),
      db.words.toArray(),
    ]);
    return { folders, lists, words };
  }, []);

  const hits = useMemo<Hit[]>(() => {
    if (!data || !q.trim()) return [];
    const needle = normalize(q);
    const out: Hit[] = [];
    for (const f of data.folders) {
      if (normalize(f.name).includes(needle))
        out.push({ type: 'folder', id: f.id, title: f.name, subtitle: 'Folder' });
    }
    for (const l of data.lists) {
      if (normalize(l.name).includes(needle) || normalize(l.language).includes(needle))
        out.push({ type: 'list', id: l.id, title: l.name, subtitle: `${l.language} · list` });
    }
    for (const w of data.words) {
      const hay = `${w.foreign} ${w.native} ${w.notes ?? ''} ${(w.tags ?? []).join(' ')}`;
      if (normalize(hay).includes(needle))
        out.push({
          type: 'word',
          id: w.id,
          listId: w.listId,
          title: `${w.foreign} → ${w.native}`,
          subtitle: 'Word',
        });
      if (out.length > 40) break;
    }
    return out.slice(0, 40);
  }, [data, q]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const go = (hit: Hit) => {
    onClose();
    if (hit.type === 'list') navigate(`/list/${hit.id}`);
    else if (hit.type === 'word') navigate(`/list/${hit.listId}`);
    else navigate('/');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="-mx-1 -mt-1">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Icon.Search size={18} className="text-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search lists, words, folders…"
            className="w-full bg-transparent text-base text-ink outline-none placeholder:text-subtle"
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {q.trim() && hits.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-subtle">
              No matches for “{q}”.
            </div>
          )}
          {hits.map((hit, i) => (
            <button
              key={hit.type + hit.id}
              onClick={() => go(hit)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left',
                i === active ? 'bg-brand/10' : 'hover:bg-surface',
              )}
            >
              <span className="text-subtle">
                {hit.type === 'list' ? (
                  <Icon.Book size={16} />
                ) : hit.type === 'folder' ? (
                  <Icon.Folder size={16} />
                ) : (
                  <Icon.Search size={16} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink" dir="auto">
                  {hit.title}
                </span>
                <span className="block text-xs text-subtle">{hit.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
