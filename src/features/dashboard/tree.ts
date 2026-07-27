import type { Folder } from '@/types';

export interface FolderNode {
  folder: Folder;
  children: FolderNode[];
  depth: number;
}

/** Build a nested tree from a flat folder list, sorted by `order` then name. */
export function buildFolderTree(folders: Folder[]): FolderNode[] {
  const byParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = f.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(f);
    byParent.set(key, arr);
  }
  const sortFn = (a: Folder, b: Folder) =>
    a.order - b.order || a.name.localeCompare(b.name);

  const build = (parentId: string | null, depth: number): FolderNode[] => {
    const kids = (byParent.get(parentId) ?? []).slice().sort(sortFn);
    return kids.map((folder) => ({
      folder,
      depth,
      children: build(folder.id, depth + 1),
    }));
  };
  return build(null, 0);
}

/** Collect a folder id and all its descendants (for "show all nested lists"). */
export function descendantFolderIds(
  folders: Folder[],
  rootId: string,
): Set<string> {
  const byParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = f.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(f);
    byParent.set(key, arr);
  }
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of byParent.get(id) ?? []) {
      out.add(child.id);
      stack.push(child.id);
    }
  }
  return out;
}
