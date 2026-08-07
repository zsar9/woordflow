import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '@/features/dashboard/useLibrary';
import { descendantFolderIds } from '@/features/dashboard/tree';
import { groupListsByFolder } from '@/features/dashboard/group';
import { FolderTree } from '@/features/dashboard/FolderTree';
import { ListCard } from '@/features/dashboard/ListCard';
import { NewListModal, NewFolderModal } from '@/features/dashboard/CreateModals';
import { ImportModal } from '@/features/import/ImportModal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/primitives';
import { useStreak } from '@/features/stats/useStreak';
import { downloadBackup, restoreBackup } from '@/lib/export';
import { useToast } from '@/components/ui/Toast';
import { languageAccent } from '@/lib/languageColor';
import { pluralize } from '@/lib/format';
import { normalize, DEFAULT_NORMALIZE } from '@/lib/text';
import { LIST_LEVELS, listLevel, type ListLevel } from '@/lib/listLevel';
import { useT } from '@/hooks/useT';
import { cn } from '@/lib/cn';

const COLLAPSE_KEY = 'woordflow.dashboard.collapsedGroups';

function readCollapseOverrides(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeCollapseOverrides(overrides: Record<string, boolean>): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(overrides));
  } catch {
    /* private mode — collapse state just won't persist across reloads */
  }
}

export function DashboardPage() {
  const { folders, lists, summaries, loading } = useLibrary();
  const streak = useStreak();
  const navigate = useNavigate();
  const toast = useToast();
  const restoreRef = useRef<HTMLInputElement>(null);
  const t = useT();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ListLevel | null>(null);
  const [onlyDue, setOnlyDue] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFolders, setShowFolders] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [collapseOverrides, setCollapseOverrides] = useState<Record<string, boolean>>(readCollapseOverrides);

  const setOverride = (key: string, collapsed: boolean) => {
    setCollapseOverrides((prev) => {
      const next = { ...prev, [key]: collapsed };
      writeCollapseOverrides(next);
      return next;
    });
  };

  // Every language present in the library, in a stable order — most lists
  // first, since that's usually the language someone is actively learning.
  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of lists) {
      if (l.archived) continue;
      counts.set(l.language, (counts.get(l.language) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);
  }, [lists]);

  // Folder + language filtered, before level/search/due — this is the pool
  // the level chips are built from, so switching language doesn't leave a
  // stale level selected that no longer matches anything.
  const baseLists = useMemo(() => {
    let ls = lists.filter((l) => !l.archived);
    if (selectedFolder) {
      const ids = descendantFolderIds(folders, selectedFolder);
      ls = ls.filter((l) => l.folderId && ids.has(l.folderId));
    }
    if (selectedLanguage) {
      ls = ls.filter((l) => l.language === selectedLanguage);
    }
    return ls;
  }, [lists, folders, selectedFolder, selectedLanguage]);

  // Levels present in the currently folder/language-filtered set, in CEFR
  // order. Only worth showing once there's more than one to choose between.
  const levels = useMemo(() => {
    const present = new Set<ListLevel>();
    for (const l of baseLists) {
      const lv = listLevel(l);
      if (lv) present.add(lv);
    }
    return LIST_LEVELS.filter((lv) => present.has(lv));
  }, [baseLists]);

  const searchQuery = useMemo(
    () => (search.trim() ? normalize(search, DEFAULT_NORMALIZE) : ''),
    [search],
  );

  // Chip-style filters only — used for the badge on the Filters toggle and
  // to decide whether the panel should offer a "Clear" action. Search has
  // its own always-visible clear (×) button, so it's tracked separately.
  const activeFilterCount =
    (selectedLanguage ? 1 : 0) + (selectedLevel ? 1 : 0) + (onlyDue ? 1 : 0);
  const filtersActive = activeFilterCount > 0 || searchQuery !== '';

  const visibleLists = useMemo(() => {
    let ls = baseLists;
    if (selectedLevel) {
      ls = ls.filter((l) => listLevel(l) === selectedLevel);
    }
    if (onlyDue) {
      ls = ls.filter((l) => (summaries.get(l.id)?.dueCount ?? 0) > 0);
    }
    if (searchQuery) {
      ls = ls.filter((l) => normalize(l.name, DEFAULT_NORMALIZE).includes(searchQuery));
    }
    return ls
      .slice()
      .sort((a, b) => (b.lastStudiedAt ?? 0) - (a.lastStudiedAt ?? 0) || a.order - b.order);
  }, [baseLists, selectedLevel, onlyDue, searchQuery, summaries]);

  // Lists are shown under a header per folder — with the curriculum installed a
  // flat list would be ~60 rows of undifferentiated text.
  const groups = useMemo(
    () => groupListsByFolder(folders, visibleLists),
    [folders, visibleLists],
  );

  const groupKey = (folderId: string | null) => folderId ?? 'unfiled';

  // Groups with due words open by default; fully rested ones start collapsed
  // to keep the page short. Any explicit user toggle overrides that default,
  // and an active search/level/due filter always forces everything open —
  // once you're actively looking for something, nothing should stay hidden.
  const isGroupCollapsed = (key: string, hasDue: boolean) => {
    if (filtersActive) return false;
    const override = collapseOverrides[key];
    return override ?? !hasDue;
  };

  // Total due words across the whole library (not just the current filter) —
  // powers the one-tap "Study due" shortcut in the header.
  const totalDue = useMemo(() => {
    let n = 0;
    for (const s of summaries.values()) n += s.dueCount;
    return n;
  }, [summaries]);

  const startStudyAllDue = () => {
    for (const s of summaries.values()) {
      if (s.dueCount > 0) {
        navigate(`/study/${s.list.id}`);
        return;
      }
    }
  };

  const handleRestore = async (file: File) => {
    try {
      await restoreBackup(await file.text());
      toast.push('Backup restored', 'success');
    } catch (e) {
      toast.push((e as Error).message, 'danger');
    }
  };

  const clearFilters = () => {
    setSelectedLanguage(null);
    setSelectedLevel(null);
    setOnlyDue(false);
    setSearch('');
  };

  const expandAll = () => {
    const next = { ...collapseOverrides };
    for (const g of groups) next[groupKey(g.folderId)] = false;
    setCollapseOverrides(next);
    writeCollapseOverrides(next);
  };

  const collapseAll = () => {
    const next = { ...collapseOverrides };
    for (const g of groups) next[groupKey(g.folderId)] = true;
    setCollapseOverrides(next);
    writeCollapseOverrides(next);
  };

  return (
    <div>
      {/* Header: title + a single one-tap action, instead of a dedicated
          due-words section. Per-list due counts still show in each row. */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-sm text-muted">
            {streak.studiedToday ? t('dashboard.subtitle.studied') : t('dashboard.subtitle.pick')}
          </p>
          <h1 className="text-3xl text-ink">{t('dashboard.title')}</h1>
        </div>
        {totalDue > 0 && (
          <Button variant="primary" onClick={startStudyAllDue}>
            {t('dashboard.studyAllDue')} · {totalDue}
          </Button>
        )}
      </div>

      {/* Search + filter/folder toggles — one compact row. The chip pickers
          and folder tree stay tucked away until asked for, so the page opens
          straight into the library instead of a wall of controls. */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon.Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dashboard.search.placeholder')}
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-8 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-subtle transition hover:text-ink"
            >
              <Icon.X size={13} />
            </button>
          )}
        </div>
        <IconToggle
          active={showFilters}
          badge={activeFilterCount}
          onClick={() => setShowFilters((v) => !v)}
          label={t('dashboard.filters')}
          icon={<Icon.Filter size={15} />}
        />
        <IconToggle
          active={showFolders}
          onClick={() => setShowFolders((v) => !v)}
          label={t('dashboard.browseFolders')}
          icon={<Icon.Folder size={15} />}
        />
      </div>

      {showFilters && (
        <div className="mb-4 space-y-3 rounded-2xl border border-border bg-surface p-3">
          {languages.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <LanguageChip
                label="All languages"
                active={selectedLanguage === null}
                onClick={() => setSelectedLanguage(null)}
              />
              {languages.map((lang) => {
                const accent = languageAccent(lang);
                return (
                  <LanguageChip
                    key={lang}
                    label={lang}
                    dotColor={accent.hex}
                    active={selectedLanguage === lang}
                    onClick={() =>
                      setSelectedLanguage((cur) => (cur === lang ? null : lang))
                    }
                  />
                );
              })}
            </div>
          )}

          {levels.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <LanguageChip
                label={t('dashboard.allLevels')}
                active={selectedLevel === null}
                onClick={() => setSelectedLevel(null)}
              />
              {levels.map((lv) => (
                <LanguageChip
                  key={lv}
                  label={lv}
                  active={selectedLevel === lv}
                  onClick={() => setSelectedLevel((cur) => (cur === lv ? null : lv))}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <LanguageChip
              label={t('dashboard.onlyDue')}
              active={onlyDue}
              onClick={() => setOnlyDue((v) => !v)}
            />
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted underline decoration-border underline-offset-4 transition hover:text-ink"
              >
                {t('dashboard.clearFilters')}
              </button>
            )}
          </div>
        </div>
      )}

      {showFolders && (
        <div className="mb-4 rounded-2xl border border-border bg-surface p-2">
          <FolderTree
            folders={folders}
            lists={lists}
            selected={selectedFolder}
            onSelect={setSelectedFolder}
          />
        </div>
      )}

      {/* Library, grouped by folder */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : visibleLists.length === 0 ? (
        <EmptyState
          icon={<Icon.Book size={32} />}
          title={filtersActive ? t('dashboard.noMatches') : t('dashboard.empty.title')}
          description={filtersActive ? undefined : t('dashboard.empty.desc')}
          action={
            filtersActive ? (
              <Button variant="secondary" onClick={clearFilters}>
                {t('dashboard.clearFilters')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => setShowNewList(true)}>
                  <Icon.Plus size={15} /> {t('dashboard.newList')}
                </Button>
                <Button variant="secondary" onClick={() => setShowImport(true)}>
                  <Icon.Import size={15} /> {t('dashboard.import')}
                </Button>
              </div>
            )
          }
        />
      ) : (
        <>
          {groups.length > 1 && (
            <div className="mb-2 flex justify-end gap-3 text-xs text-muted">
              <button
                onClick={expandAll}
                className="underline decoration-border underline-offset-4 hover:text-ink"
              >
                {t('dashboard.expandAll')}
              </button>
              <button
                onClick={collapseAll}
                className="underline decoration-border underline-offset-4 hover:text-ink"
              >
                {t('dashboard.collapseAll')}
              </button>
            </div>
          )}
          <div className="space-y-4">
            {groups.map((group) => {
              const accent = group.language ? languageAccent(group.language) : null;
              const key = groupKey(group.folderId);
              const groupDue = group.lists.reduce(
                (a, l) => a + (summaries.get(l.id)?.dueCount ?? 0),
                0,
              );
              const collapsed = isGroupCollapsed(key, groupDue > 0);
              return (
                <section key={key}>
                  <button
                    onClick={() => setOverride(key, !collapsed)}
                    className="mb-2 flex w-full items-baseline gap-2 px-1 text-left"
                  >
                    <Icon.Chevron
                      size={13}
                      className={cn('shrink-0 text-subtle transition-transform', !collapsed && 'rotate-90')}
                    />
                    <span className="flex flex-col">
                      {group.breadcrumb.length > 0 && (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                          {group.breadcrumb.join(' · ')}
                        </span>
                      )}
                      <span className="flex items-baseline gap-2">
                        {group.icon && <span className="text-base leading-none">{group.icon}</span>}
                        <span className="font-serif text-xl text-ink">{group.title}</span>
                        {accent && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: accent.hex }}
                          />
                        )}
                      </span>
                    </span>
                    <span className="ml-auto flex items-center gap-2 text-xs tabular-nums text-subtle">
                      {groupDue > 0 && <span className="text-brand">{groupDue} due</span>}
                      {pluralize(group.lists.length, 'list')}
                    </span>
                  </button>

                  {!collapsed && (
                    <div className="rounded-2xl border border-border bg-surface px-4">
                      <div className="flex items-center gap-4 border-b border-border py-2.5 text-[11px] font-medium uppercase tracking-wide text-subtle">
                        <span className="w-[3px]" />
                        <span className="flex-1">{t('dashboard.col.list')}</span>
                        <span className="hidden w-16 shrink-0 text-right sm:block">
                          {t('dashboard.col.words')}
                        </span>
                        <span className="w-10 shrink-0 text-right">{t('dashboard.col.due')}</span>
                        <span className="hidden w-28 shrink-0 md:block">
                          {t('dashboard.col.mastery')}
                        </span>
                        <span className="hidden w-24 shrink-0 text-right lg:block">
                          {t('dashboard.col.lastStudied')}
                        </span>
                      </div>
                      {group.lists.map((list) => {
                        const summary = summaries.get(list.id);
                        return summary ? <ListCard key={list.id} summary={summary} /> : null;
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* Footer: create/import + backup */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <button
            onClick={() => setShowNewList(true)}
            className="text-muted underline decoration-border underline-offset-4 transition hover:text-ink"
          >
            {t('dashboard.newList')}
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            className="text-muted underline decoration-border underline-offset-4 transition hover:text-ink"
          >
            {t('dashboard.newFolder')}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="text-muted underline decoration-border underline-offset-4 transition hover:text-ink"
          >
            {t('dashboard.import')}
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-subtle">
          <span>{t('dashboard.storedLocally')}</span>
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
            {t('dashboard.restore')}
          </button>
          <button onClick={() => void downloadBackup()} className="underline underline-offset-4 hover:text-ink">
            {t('dashboard.backup')}
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

function IconToggle({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition',
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-border bg-surface text-muted hover:text-ink',
      )}
    >
      {icon}
      {!!badge && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-canvas">
          {badge}
        </span>
      )}
    </button>
  );
}

function LanguageChip({
  label,
  dotColor,
  active,
  onClick,
}: {
  label: string;
  dotColor?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-border bg-surface text-muted hover:text-ink',
      )}
    >
      {dotColor && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      )}
      {label}
    </button>
  );
}
