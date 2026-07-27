/**
 * Dexie (IndexedDB) database definition. Everything the app stores lives here so
 * it persists across reloads and works fully offline.
 */

import Dexie, { type Table } from 'dexie';
import type {
  DailyActivity,
  Folder,
  Settings,
  StoryProgress,
  StudyList,
  StudySession,
  Word,
  WordStat,
} from '@/types';

export class WoordFlowDB extends Dexie {
  folders!: Table<Folder, string>;
  lists!: Table<StudyList, string>;
  words!: Table<Word, string>;
  stats!: Table<WordStat, string>;
  sessions!: Table<StudySession, string>;
  activity!: Table<DailyActivity, string>;
  settings!: Table<Settings, string>;
  storyProgress!: Table<StoryProgress, string>;

  constructor() {
    super('woordflow');
    // Indexes: only fields we query/sort by need to be listed.
    this.version(1).stores({
      folders: 'id, parentId, order',
      lists: 'id, folderId, language, order, lastStudiedAt',
      words: 'id, listId, order, bookmarked, [listId+order]',
      stats: 'wordId, listId, dueAt, mastery, difficultyScore',
      sessions: 'id, listId, startedAt',
      activity: 'date',
      settings: 'id',
    });
    // v2: reading stories feature — per-story progress, keyed by storyId.
    this.version(2).stores({
      storyProgress: 'storyId',
    });
  }
}

export const db = new WoordFlowDB();
