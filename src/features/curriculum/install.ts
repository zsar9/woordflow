/**
 * Installs the built-in curricula into the user's library.
 *
 * Design constraints:
 *  - **Idempotent.** Every folder and list carries a stable `sourceKey`. A list
 *    that is already present is never touched again, so edits the user makes to
 *    a curriculum list — and all of their SRS progress — survive every reload
 *    and every future content update.
 *  - **Additive.** Nothing the user created is renamed, moved or deleted.
 *  - **Resumable.** If the browser is closed halfway through, the next run picks
 *    up exactly where it stopped (the version flag is only written on success).
 *
 * Bump `CURRICULUM_VERSION` whenever new lists are added to the content files;
 * existing lists stay as they are and only the new ones get installed.
 */

import { db } from '@/db/db';
import { addWords, createFolder, createList, listFolders, listLists } from '@/db/repo';
import type { Folder, StudyList } from '@/types';
import { CURRICULA } from './curriculum';
import type { CurriculumList, LanguageCurriculum } from './types';

export const CURRICULUM_VERSION = 2;

const VERSION_KEY = 'woordflow.curriculum.version';
const ROOT_KEY = 'curriculum';

/** Folder order for the curriculum root: negative so it sorts above user folders. */
const ROOT_ORDER = -1000;

export interface InstallResult {
  installedLists: number;
  installedEntries: number;
  skipped: boolean;
}

function readVersion(): number {
  try {
    return Number(localStorage.getItem(VERSION_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function writeVersion(v: number): void {
  try {
    localStorage.setItem(VERSION_KEY, String(v));
  } catch {
    /* private mode — the sourceKey check below still keeps us idempotent */
  }
}

/**
 * Guards against overlapping installs. The version flag is only written when an
 * install *finishes*, so two calls that start together would both see version 0,
 * both find no `sourceKey`s, and both create the full curriculum — 120 lists
 * instead of 60. React StrictMode double-invokes mount effects in development,
 * which makes that the normal case rather than a rare race.
 */
let inflight: Promise<InstallResult> | null = null;

/**
 * Add the curricula to the library. Safe to call on every app start: it returns
 * immediately once the current version is installed, and concurrent calls share
 * a single run.
 */
export function installCurriculum(): Promise<InstallResult> {
  if (!inflight) {
    inflight = runInstall().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function runInstall(): Promise<InstallResult> {
  const result: InstallResult = { installedLists: 0, installedEntries: 0, skipped: false };

  if (readVersion() >= CURRICULUM_VERSION) {
    result.skipped = true;
    return result;
  }

  const [folders, lists] = await Promise.all([listFolders(), listLists()]);

  const folderByKey = new Map<string, Folder>();
  for (const f of folders) if (f.sourceKey) folderByKey.set(f.sourceKey, f);

  const listByKey = new Map<string, StudyList>();
  for (const l of lists) if (l.sourceKey) listByKey.set(l.sourceKey, l);

  async function ensureFolder(
    key: string,
    name: string,
    parentId: string | null,
    order: number,
    icon?: string,
  ): Promise<Folder> {
    const existing = folderByKey.get(key);
    if (existing) return existing;
    const created = await createFolder({ name, parentId, icon, order, sourceKey: key });
    folderByKey.set(key, created);
    return created;
  }

  const root = await ensureFolder(ROOT_KEY, 'Curriculum', null, ROOT_ORDER, '🎓');

  // Global ordering counter so lists sort in curriculum order on the dashboard.
  let listOrder = ROOT_ORDER;

  for (let li = 0; li < CURRICULA.length; li++) {
    const curriculum = CURRICULA[li];
    const langFolder = await ensureFolder(
      `${ROOT_KEY}.${curriculum.key}`,
      curriculum.language,
      root.id,
      ROOT_ORDER + 1 + li * 100,
      curriculum.icon,
    );

    let stageOrder = 0;
    for (const track of curriculum.tracks) {
      for (const stage of track.stages) {
        const stageFolder = await ensureFolder(
          `${ROOT_KEY}.${stage.key}`,
          stage.title,
          langFolder.id,
          ROOT_ORDER + 1 + li * 100 + ++stageOrder,
          track.kind === 'vocabulary' ? '📗' : '💬',
        );

        const inStage = track.lists.filter(
          (l) => l.index >= stage.from && l.index <= stage.to,
        );

        for (const item of inStage) {
          listOrder++;
          const key = `${ROOT_KEY}.${item.key}`;
          if (listByKey.has(key)) continue;

          const created = await createListFor(
            curriculum,
            item,
            key,
            stageFolder.id,
            stage.level,
            track.category,
            listOrder,
          );
          listByKey.set(key, created);
          result.installedLists++;
          result.installedEntries += item.entries.length;
        }
      }
    }
  }

  writeVersion(CURRICULUM_VERSION);
  return result;
}

async function createListFor(
  curriculum: LanguageCurriculum,
  item: CurriculumList,
  sourceKey: string,
  folderId: string,
  level: string,
  category: StudyList['category'],
  order: number,
): Promise<StudyList> {
  const list = await createList({
    name: `${String(item.index).padStart(2, '0')} · ${item.title}`,
    folderId,
    language: curriculum.language,
    nativeLanguage: 'English',
    description: `${level} · ${item.blurb}`,
    category,
    order,
    sourceKey,
  });

  await addWords(
    list.id,
    item.entries.map((e) => ({
      foreign: e.foreign,
      native: e.native,
      foreignAlt: e.foreignAlt,
      nativeAlt: e.nativeAlt,
      notes: e.notes,
      category,
    })),
  );

  return list;
}

/**
 * Forget that the curriculum was ever installed, so the next app start puts it
 * back. Call this after wiping the database, otherwise the version flag would
 * keep the library empty.
 */
export function forgetCurriculumInstall(): void {
  writeVersion(0);
}

/**
 * Remove every installed curriculum list and folder, then reinstall from the
 * shipped content. Destroys progress on curriculum lists only — user-made lists
 * are untouched. Exposed for the Settings screen.
 */
export async function resetCurriculum(): Promise<InstallResult> {
  const [folders, lists] = await Promise.all([listFolders(), listLists()]);
  const prefix = `${ROOT_KEY}.`;

  const listIds = lists
    .filter((l) => l.sourceKey?.startsWith(prefix))
    .map((l) => l.id);

  await db.transaction('rw', db.lists, db.words, db.stats, db.sessions, async () => {
    for (const id of listIds) {
      const wordIds = await db.words.where('listId').equals(id).primaryKeys();
      await db.stats.bulkDelete(wordIds);
      await db.words.where('listId').equals(id).delete();
      await db.sessions.where('listId').equals(id).delete();
      await db.lists.delete(id);
    }
  });

  const folderIds = folders
    .filter((f) => f.sourceKey === ROOT_KEY || f.sourceKey?.startsWith(prefix))
    .map((f) => f.id);
  await db.folders.bulkDelete(folderIds);

  writeVersion(0);
  return installCurriculum();
}
