/**
 * Repository layer: all reads/writes go through these functions so components
 * never touch Dexie directly. Keeps invariants (stat rows exist for every word,
 * ordering, timestamps) in one place.
 */

import { db } from './db';
import { uid, now } from '@/lib/id';
import { initialStat } from '@/lib/srs';
import {
  DEFAULT_SETTINGS,
  type Folder,
  type Settings,
  type StoryProgress,
  type StudyList,
  type StudySession,
  type Word,
  type WordStat,
} from '@/types';

/* ------------------------------- settings -------------------------------- */

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('app');
  if (s) return { ...DEFAULT_SETTINGS, ...s };
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch, id: 'app' as const };
  await db.settings.put(next);
  return next;
}

/* -------------------------------- folders -------------------------------- */

export async function createFolder(
  input: Partial<Folder> & { name: string },
): Promise<Folder> {
  // Note: IndexedDB can't index null keys, so we don't query by parentId===null.
  // A global monotonic order is fine; the tree sorts siblings by `order`.
  const order = input.order ?? (await db.folders.count());
  const folder: Folder = {
    id: uid(),
    name: input.name,
    parentId: input.parentId ?? null,
    icon: input.icon,
    color: input.color,
    order,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.folders.put(folder);
  return folder;
}

export async function updateFolder(
  id: string,
  patch: Partial<Folder>,
): Promise<void> {
  await db.folders.update(id, { ...patch, updatedAt: now() });
}

/** Delete a folder. Child folders/lists are re-parented to the grandparent. */
export async function deleteFolder(id: string): Promise<void> {
  const folder = await db.folders.get(id);
  if (!folder) return;
  const newParent = folder.parentId;
  await db.transaction('rw', db.folders, db.lists, async () => {
    await db.folders.where('parentId').equals(id).modify({ parentId: newParent });
    await db.lists.where('folderId').equals(id).modify({ folderId: newParent });
    await db.folders.delete(id);
  });
}

export function listFolders(): Promise<Folder[]> {
  return db.folders.toArray();
}

/* --------------------------------- lists --------------------------------- */

export async function createList(
  input: Partial<StudyList> & { name: string },
): Promise<StudyList> {
  const list: StudyList = {
    id: uid(),
    name: input.name,
    folderId: input.folderId ?? null,
    language: input.language ?? 'Unknown',
    nativeLanguage: input.nativeLanguage ?? 'English',
    description: input.description,
    category: input.category,
    createdAt: now(),
    updatedAt: now(),
    order: input.order ?? (await db.lists.count()),
    archived: false,
  };
  await db.lists.put(list);
  return list;
}

export async function updateList(
  id: string,
  patch: Partial<StudyList>,
): Promise<void> {
  await db.lists.update(id, { ...patch, updatedAt: now() });
}

export async function deleteList(id: string): Promise<void> {
  await db.transaction('rw', db.lists, db.words, db.stats, db.sessions, async () => {
    const wordIds = await db.words.where('listId').equals(id).primaryKeys();
    await db.stats.bulkDelete(wordIds);
    await db.words.where('listId').equals(id).delete();
    await db.sessions.where('listId').equals(id).delete();
    await db.lists.delete(id);
  });
}

export function getList(id: string): Promise<StudyList | undefined> {
  return db.lists.get(id);
}

export function listLists(): Promise<StudyList[]> {
  return db.lists.toArray();
}

/** Duplicate a list and all its words (fresh stats). */
export async function duplicateList(id: string): Promise<StudyList | undefined> {
  const src = await db.lists.get(id);
  if (!src) return undefined;
  const copy = await createList({
    ...src,
    name: `${src.name} (copy)`,
    id: undefined,
  });
  const words = await db.words.where('listId').equals(id).sortBy('order');
  const cloned = words.map((w, i) => ({
    ...w,
    id: uid(),
    listId: copy.id,
    order: i,
    createdAt: now(),
    updatedAt: now(),
  }));
  await db.words.bulkPut(cloned);
  await db.stats.bulkPut(cloned.map((w) => initialStat(w.id, copy.id, w.difficulty ?? 3)));
  return copy;
}

/** Merge `sourceIds` lists into `targetId` (words moved, sources deleted). */
export async function mergeLists(
  targetId: string,
  sourceIds: string[],
): Promise<void> {
  await db.transaction('rw', db.lists, db.words, db.stats, db.sessions, async () => {
    let order = await db.words.where('listId').equals(targetId).count();
    for (const sid of sourceIds) {
      if (sid === targetId) continue;
      const words = await db.words.where('listId').equals(sid).sortBy('order');
      for (const w of words) {
        await db.words.update(w.id, { listId: targetId, order: order++ });
        await db.stats.update(w.id, { listId: targetId });
      }
      await db.sessions.where('listId').equals(sid).delete();
      await db.lists.delete(sid);
    }
  });
}

/* --------------------------------- words --------------------------------- */

export async function addWord(
  listId: string,
  input: Partial<Word> & { foreign: string; native: string },
): Promise<Word> {
  const order = input.order ?? (await db.words.where('listId').equals(listId).count());
  const word: Word = {
    id: uid(),
    listId,
    foreign: input.foreign,
    native: input.native,
    foreignAlt: input.foreignAlt,
    nativeAlt: input.nativeAlt,
    exampleSentence: input.exampleSentence,
    sentenceTranslation: input.sentenceTranslation,
    notes: input.notes,
    tags: input.tags,
    category: input.category,
    difficulty: input.difficulty,
    bookmarked: input.bookmarked ?? false,
    order,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.words.put(word);
  await db.stats.put(initialStat(word.id, listId, word.difficulty ?? 3));
  return word;
}

/** Bulk add (used by importers) — one transaction, one stat row per word. */
export async function addWords(
  listId: string,
  inputs: Array<Partial<Word> & { foreign: string; native: string }>,
): Promise<number> {
  const base = await db.words.where('listId').equals(listId).count();
  const words: Word[] = inputs.map((input, i) => ({
    id: uid(),
    listId,
    foreign: input.foreign,
    native: input.native,
    foreignAlt: input.foreignAlt,
    nativeAlt: input.nativeAlt,
    exampleSentence: input.exampleSentence,
    sentenceTranslation: input.sentenceTranslation,
    notes: input.notes,
    tags: input.tags,
    category: input.category,
    difficulty: input.difficulty,
    bookmarked: false,
    order: base + i,
    createdAt: now(),
    updatedAt: now(),
  }));
  await db.transaction('rw', db.words, db.stats, db.lists, async () => {
    await db.words.bulkPut(words);
    await db.stats.bulkPut(
      words.map((w) => initialStat(w.id, listId, w.difficulty ?? 3)),
    );
    await db.lists.update(listId, { updatedAt: now() });
  });
  return words.length;
}

export async function updateWord(id: string, patch: Partial<Word>): Promise<void> {
  await db.words.update(id, { ...patch, updatedAt: now() });
}

export async function deleteWord(id: string): Promise<void> {
  await db.transaction('rw', db.words, db.stats, async () => {
    await db.words.delete(id);
    await db.stats.delete(id);
  });
}

export function wordsOfList(listId: string): Promise<Word[]> {
  return db.words.where('listId').equals(listId).sortBy('order');
}

export async function toggleBookmark(id: string): Promise<void> {
  const w = await db.words.get(id);
  if (w) await db.words.update(id, { bookmarked: !w.bookmarked });
}

/* --------------------------------- stats --------------------------------- */

export function statsOfList(listId: string): Promise<WordStat[]> {
  return db.stats.where('listId').equals(listId).toArray();
}

export async function getStat(wordId: string): Promise<WordStat | undefined> {
  return db.stats.get(wordId);
}

export async function putStat(stat: WordStat): Promise<void> {
  await db.stats.put(stat);
}

/* -------------------------------- sessions ------------------------------- */

export async function saveSession(session: StudySession): Promise<void> {
  await db.sessions.put(session);
}

export function sessionsOfList(listId: string): Promise<StudySession[]> {
  return db.sessions.where('listId').equals(listId).reverse().sortBy('startedAt');
}

export function allSessions(): Promise<StudySession[]> {
  return db.sessions.toArray();
}

/* -------------------------- daily activity / streak ---------------------- */

export function localDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function recordActivity(
  ts: number,
  deltas: { studyMs: number; answers: number; correct: number; xp: number },
): Promise<void> {
  const date = localDateKey(ts);
  const existing = await db.activity.get(date);
  const next = {
    date,
    studyMs: (existing?.studyMs ?? 0) + deltas.studyMs,
    answers: (existing?.answers ?? 0) + deltas.answers,
    correct: (existing?.correct ?? 0) + deltas.correct,
    xp: (existing?.xp ?? 0) + deltas.xp,
  };
  await db.activity.put(next);
}

export function allActivity() {
  return db.activity.toArray();
}

/* --------------------------- reading & stories ---------------------------- */

export function getStoryProgress(storyId: string): Promise<StoryProgress | undefined> {
  return db.storyProgress.get(storyId);
}

export function allStoryProgress(): Promise<StoryProgress[]> {
  return db.storyProgress.toArray();
}

/** Record that a story was opened for reading (does not affect quiz scores). */
export async function recordStoryRead(storyId: string): Promise<StoryProgress> {
  const existing = await db.storyProgress.get(storyId);
  const next: StoryProgress = existing
    ? { ...existing, timesRead: existing.timesRead + 1 }
    : {
        storyId,
        timesRead: 1,
        timesQuizzed: 0,
        bestScore: 0,
        missedQuestionIds: [],
      };
  await db.storyProgress.put(next);
  return next;
}

/** Record a completed quiz attempt, keeping the best score across attempts. */
export async function recordStoryQuizResult(
  storyId: string,
  score: number,
  missedQuestionIds: string[],
): Promise<StoryProgress> {
  const existing = await db.storyProgress.get(storyId);
  const next: StoryProgress = {
    storyId,
    timesRead: existing?.timesRead ?? 1,
    timesQuizzed: (existing?.timesQuizzed ?? 0) + 1,
    bestScore: Math.max(existing?.bestScore ?? 0, score),
    lastScore: score,
    lastCompletedAt: now(),
    missedQuestionIds,
  };
  await db.storyProgress.put(next);
  return next;
}
