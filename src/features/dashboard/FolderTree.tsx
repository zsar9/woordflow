import type * as React from 'react';
import { useState } from 'react';
import { buildFolderTree, type FolderNode } from './tree';
import type { Folder, StudyList } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface Props {
  folders: Folder[];
  lists: StudyList[];
  selected: string | null; // folder id or null (= all)
  onSelect: (id: string | null) => void;
}

export function FolderTree({ folders, lists, selected, onSelect }: Props) {
  const tree = buildFolderTree(folders);
  const totalLists = lists.length;

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <TreeRow
        label="All lists"
        icon={<Icon.Book size={16} />}
        count={totalLists}
        active={selected === null}
        depth={0}
        onClick={() => onSelect(null)}
      />
      {tree.map((node) => (
        <TreeBranch
          key={node.folder.id}
          node={node}
          lists={lists}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function countListsIn(node: FolderNode, lists: StudyList[]): number {
  let count = lists.filter((l) => l.folderId === node.folder.id).length;
  for (const child of node.children) count += countListsIn(child, lists);
  return count;
}

function TreeBranch({
  node,
  lists,
  selected,
  onSelect,
}: {
  node: FolderNode;
  lists: StudyList[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const count = countListsIn(node, lists);

  return (
    <>
      <TreeRow
        label={node.folder.name}
        icon={
          node.folder.icon ? (
            <span className="text-base leading-none">{node.folder.icon}</span>
          ) : (
            <Icon.Folder size={16} />
          )
        }
        count={count}
        active={selected === node.folder.id}
        depth={node.depth}
        expandable={hasChildren}
        expanded={open}
        onToggle={() => setOpen((o) => !o)}
        onClick={() => onSelect(node.folder.id)}
      />
      {open &&
        node.children.map((child) => (
          <TreeBranch
            key={child.folder.id}
            node={child}
            lists={lists}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

function TreeRow({
  label,
  icon,
  count,
  active,
  depth,
  expandable,
  expanded,
  onToggle,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  active: boolean;
  depth: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-lg pr-2 transition',
        active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface hover:text-ink',
      )}
      style={{ paddingLeft: 6 + depth * 14 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        className={cn(
          'flex h-6 w-5 items-center justify-center rounded transition',
          !expandable && 'invisible',
        )}
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        <Icon.Chevron
          size={14}
          className={cn('transition-transform', expanded && 'rotate-90')}
        />
      </button>
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate font-medium">{label}</span>
        <span className="ml-auto text-[11px] tabular-nums text-subtle">{count}</span>
      </button>
    </div>
  );
}
