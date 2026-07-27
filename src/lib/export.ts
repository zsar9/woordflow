/**
 * Export & backup. Produces JSON/CSV for a single list and a full-database
 * backup that round-trips through `restoreBackup`.
 */

import { db } from '@/db/db';
import type { Word } from '@/types';
import { wordsOfList, getList } from '@/db/repo';

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function wordsToCsv(words: Word[]): string {
  const header = [
    'foreign',
    'native',
    'exampleSentence',
    'sentenceTranslation',
    'notes',
    'tags',
    'category',
    'difficulty',
  ];
  const lines = [header.join(',')];
  for (const w of words) {
    lines.push(
      [
        w.foreign,
        w.native,
        w.exampleSentence,
        w.sentenceTranslation,
        w.notes,
        (w.tags ?? []).join('; '),
        w.category,
        w.difficulty,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}

export async function exportListCsv(listId: string): Promise<void> {
  const [list, words] = await Promise.all([getList(listId), wordsOfList(listId)]);
  download(`${list?.name ?? 'list'}.csv`, wordsToCsv(words), 'text/csv');
}

export async function exportListJson(listId: string): Promise<void> {
  const [list, words] = await Promise.all([getList(listId), wordsOfList(listId)]);
  const payload = {
    kind: 'woordflow-list',
    version: 1,
    list: { name: list?.name, language: list?.language, nativeLanguage: list?.nativeLanguage },
    words: words.map(({ id, listId: _l, order, createdAt, updatedAt, ...rest }) => rest),
  };
  download(`${list?.name ?? 'list'}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

/* ------------------------------ full backup ------------------------------ */

export interface Backup {
  kind: 'woordflow-backup';
  version: 1;
  exportedAt: number;
  folders: unknown[];
  lists: unknown[];
  words: unknown[];
  stats: unknown[];
  sessions: unknown[];
  activity: unknown[];
  settings: unknown[];
}

export async function createBackup(): Promise<Backup> {
  const [folders, lists, words, stats, sessions, activity, settings] =
    await Promise.all([
      db.folders.toArray(),
      db.lists.toArray(),
      db.words.toArray(),
      db.stats.toArray(),
      db.sessions.toArray(),
      db.activity.toArray(),
      db.settings.toArray(),
    ]);
  return {
    kind: 'woordflow-backup',
    version: 1,
    exportedAt: Date.now(),
    folders,
    lists,
    words,
    stats,
    sessions,
    activity,
    settings,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await createBackup();
  const stamp = new Date().toISOString().slice(0, 10);
  download(`woordflow-backup-${stamp}.json`, JSON.stringify(backup), 'application/json');
}

/** Replace the entire database with the contents of a backup. */
export async function restoreBackup(json: string): Promise<void> {
  const data = JSON.parse(json) as Backup;
  if (data.kind !== 'woordflow-backup') {
    throw new Error('This file is not a WoordFlow backup.');
  }
  await db.transaction(
    'rw',
    [db.folders, db.lists, db.words, db.stats, db.sessions, db.activity, db.settings],
    async () => {
      await Promise.all([
        db.folders.clear(),
        db.lists.clear(),
        db.words.clear(),
        db.stats.clear(),
        db.sessions.clear(),
        db.activity.clear(),
        db.settings.clear(),
      ]);
      await db.folders.bulkPut(data.folders as never);
      await db.lists.bulkPut(data.lists as never);
      await db.words.bulkPut(data.words as never);
      await db.stats.bulkPut(data.stats as never);
      await db.sessions.bulkPut(data.sessions as never);
      await db.activity.bulkPut(data.activity as never);
      await db.settings.bulkPut(data.settings as never);
    },
  );
}
