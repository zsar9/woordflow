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

export const CURRICULUM_VERSION = 8;

const VERSION_KEY = 'woordflow.curriculum.version';
const ROOT_KEY = 'curriculum';

/**
 * sourceKey prefixes for curriculum content that has been removed from
 * `CURRICULA` (Spanish entirely, plus the original Darija vocabulary and
 * sentence tracks) on 2026-10-20. Because installs are additive-only, these
 * are swept out of the user's live library on version bump — see
 * `cleanupRemovedContent()`.
 */
const REMOVED_SOURCE_KEY_PREFIXES = [
  `${ROOT_KEY}.spanish.`,
  `${ROOT_KEY}.darija.vocab.`,
  `${ROOT_KEY}.darija.sent.`,
];

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

/**
 * One-time sweep (run as part of the version-7 install) that deletes any
 * already-installed lists/folders whose `sourceKey` matches content that has
 * since been removed from `CURRICULA` — Spanish entirely, and the original
 * Darija vocabulary/sentence tracks. Installs are additive-only, so without
 * this the user's existing library would keep that content forever even
 * though it no longer ships. User-made lists (no `sourceKey`, or a
 * `sourceKey` outside these prefixes) are never touched.
 */
async function cleanupRemovedContent(): Promise<void> {
  const [folders, lists] = await Promise.all([listFolders(), listLists()]);

  const isRemoved = (key: string | undefined): key is string =>
    !!key && REMOVED_SOURCE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

  const listIds = lists.filter((l) => isRemoved(l.sourceKey)).map((l) => l.id);
  if (listIds.length === 0 && !folders.some((f) => isRemoved(f.sourceKey))) return;

  await db.transaction('rw', db.lists, db.words, db.stats, db.sessions, async () => {
    for (const id of listIds) {
      const wordIds = await db.words.where('listId').equals(id).primaryKeys();
      await db.stats.bulkDelete(wordIds);
      await db.words.where('listId').equals(id).delete();
      await db.sessions.where('listId').equals(id).delete();
      await db.lists.delete(id);
    }
  });

  // Folders for the removed content (e.g. the Spanish language folder, and the
  // old Darija vocabulary/sentence stage folders) are now empty — delete them
  // too. Folders that still contain surviving lists (sourceKey-less or
  // otherwise) are left alone regardless of their own sourceKey.
  const remainingLists = await listLists();
  const folderHasSurvivingList = new Set(remainingLists.map((l) => l.folderId));
  const folderIds = folders
    .filter((f) => isRemoved(f.sourceKey) && !folderHasSurvivingList.has(f.id))
    .map((f) => f.id);
  if (folderIds.length > 0) await db.folders.bulkDelete(folderIds);
}

async function runInstall(): Promise<InstallResult> {
  const result: InstallResult = { installedLists: 0, installedEntries: 0, skipped: false };

  if (readVersion() >= CURRICULUM_VERSION) {
    result.skipped = true;
    return result;
  }

  await cleanupRemovedContent();

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
          track.kind === 'vocabulary'
            ? '📗'
            : track.kind === 'sentences'
              ? '💬'
              : track.kind === 'verbs'
                ? '🔁'
                : '🧩',
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
