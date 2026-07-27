import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { isMastered } from '@/lib/srs';
import type { Folder, StudyList, WordStat } from '@/types';

export interface ListSummary {
  list: StudyList;
  wordCount: number;
  mastery: number; // 0..1 average
  masteredCount: number;
  difficultCount: number;
  dueCount: number;
  avgGrade: number; // 0..100
  lastGrade?: number; // 0..100
  lastStudiedAt?: number;
  hasProgress: boolean;
}

export interface Library {
  folders: Folder[];
  lists: StudyList[];
  summaries: Map<string, ListSummary>;
  loading: boolean;
}

/**
 * Single reactive source for the dashboard: folders, lists and a computed
 * summary per list. Recomputes automatically when the DB changes.
 */
export function useLibrary(): Library {
  const data = useLiveQuery(async () => {
    const [folders, lists, words, stats, sessions] = await Promise.all([
      db.folders.toArray(),
      db.lists.toArray(),
      db.words.toArray(),
      db.stats.toArray(),
      db.sessions.toArray(),
    ]);

    const wordsByList = new Map<string, number>();
    for (const w of words) {
      wordsByList.set(w.listId, (wordsByList.get(w.listId) ?? 0) + 1);
    }

    const statsByList = new Map<string, WordStat[]>();
    for (const s of stats) {
      const arr = statsByList.get(s.listId) ?? [];
      arr.push(s);
      statsByList.set(s.listId, arr);
    }

    const now = Date.now();
    const summaries = new Map<string, ListSummary>();
    for (const list of lists) {
      const st = statsByList.get(list.id) ?? [];
      const wordCount = wordsByList.get(list.id) ?? 0;
      const studied = st.filter((s) => s.timesStudied > 0);
      const mastery =
        st.length > 0 ? st.reduce((a, s) => a + s.mastery, 0) / st.length : 0;
      const masteredCount = st.filter(isMastered).length;
      const difficultCount = st.filter((s) => s.difficultyScore >= 3).length;
      const dueCount = st.filter((s) => s.dueAt <= now && s.timesStudied > 0).length;

      const listSessions = sessions
        .filter((s) => s.listId === list.id && s.summary)
        .sort((a, b) => (a.startedAt - b.startedAt));
      const grades = listSessions.map((s) => s.summary!.grade);
      const avgGrade = grades.length
        ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
        : 0;
      const lastGrade = grades.length ? grades[grades.length - 1] : undefined;

      summaries.set(list.id, {
        list,
        wordCount,
        mastery,
        masteredCount,
        difficultCount,
        dueCount,
        avgGrade,
        lastGrade,
        lastStudiedAt: list.lastStudiedAt,
        hasProgress: studied.length > 0,
      });
    }

    return { folders, lists, summaries };
  }, []);

  return {
    folders: data?.folders ?? [],
    lists: data?.lists ?? [],
    summaries: data?.summaries ?? new Map(),
    loading: data === undefined,
  };
}
