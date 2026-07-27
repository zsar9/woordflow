import { buildFolderTree, type FolderNode } from './tree';
import type { Folder, StudyList } from '@/types';

/** A run of lists shown under one header on the dashboard. */
export interface ListGroup {
  /** Folder id, or null for lists that sit outside any folder. */
  folderId: string | null;
  /** The header text, e.g. "Vocabulary I · Foundations". */
  title: string;
  /** Ancestor names above the header, e.g. ["Curriculum", "Spanish"]. */
  breadcrumb: string[];
  icon?: string;
  /** The language of the lists in this group, when they all share one. */
  language?: string;
  lists: StudyList[];
}

/**
 * Group lists by the folder they live in, in library-tree order, so the
 * dashboard can render a header per folder instead of one flat wall of rows.
 *
 * Folders with no lists of their own are skipped (their children still appear),
 * which keeps the container folders — "Curriculum", "Spanish" — out of the way
 * while still showing up as breadcrumb context on the groups beneath them.
 */
export function groupListsByFolder(
  folders: Folder[],
  lists: StudyList[],
): ListGroup[] {
  const byFolder = new Map<string | null, StudyList[]>();
  for (const l of lists) {
    const key = l.folderId ?? null;
    const arr = byFolder.get(key) ?? [];
    arr.push(l);
    byFolder.set(key, arr);
  }

  const groups: ListGroup[] = [];

  const walk = (nodes: FolderNode[], trail: string[]) => {
    for (const node of nodes) {
      const own = byFolder.get(node.folder.id);
      if (own && own.length > 0) {
        const languages = new Set(own.map((l) => l.language));
        groups.push({
          folderId: node.folder.id,
          title: node.folder.name,
          breadcrumb: trail,
          icon: node.folder.icon,
          language: languages.size === 1 ? own[0].language : undefined,
          lists: own.slice().sort((a, b) => a.order - b.order),
        });
      }
      walk(node.children, [...trail, node.folder.name]);
    }
  };

  walk(buildFolderTree(folders), []);

  const loose = byFolder.get(null);
  if (loose && loose.length > 0) {
    groups.push({
      folderId: null,
      title: 'Unfiled',
      breadcrumb: [],
      lists: loose
        .slice()
        .sort((a, b) => (b.lastStudiedAt ?? 0) - (a.lastStudiedAt ?? 0) || a.order - b.order),
    });
  }

  return groups;
}
