import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { wordsOfList, statsOfList, getList } from '@/db/repo';
import { SessionSetup } from '@/features/study/SessionSetup';
import { StudyScreen } from '@/features/study/StudyScreen';
import { useSettings } from '@/hooks/useSettings';
import type { SessionConfig, Word, WordStat } from '@/types';

export function StudyPage() {
  const { listId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { settings, loaded } = useSettings();
  const isReviewMode = params.get('mode') === 'review';

  const [config, setConfig] = useState<SessionConfig | null>(null);

  const data = useLiveQuery(async () => {
    if (!listId) return null;
    const [list, words, stats] = await Promise.all([
      getList(listId),
      wordsOfList(listId),
      statsOfList(listId),
    ]);
    return { list, words, stats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  // In review mode, auto-build a config that targets previously-missed words.
  useEffect(() => {
    if (!isReviewMode || !loaded || !listId || config) return;
    setConfig({
      listId,
      count: 'all',
      direction: settings.defaultDirection,
      order: 'only-incorrect',
      enableHints: settings.enableHints,
      enableFuzzy: settings.enableFuzzy,
      forgiveness: settings.forgiveness,
      askConfidence: false,
      onlyDifficult: false,
      onlyIncorrect: true,
      onlyNew: false,
      onlyBookmarked: false,
    });
  }, [isReviewMode, loaded, listId, config, settings]);

  const eligibleCount = useMemo(() => data?.words.length ?? 0, [data]);

  if (!listId) {
    navigate('/');
    return null;
  }
  if (!data || !loaded) {
    return <FullscreenSpinner />;
  }
  if (!data.list) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        List not found.
      </div>
    );
  }

  if (!config) {
    return (
      <SessionSetup
        list={data.list}
        wordCount={eligibleCount}
        settings={settings}
        onStart={setConfig}
        onCancel={() => navigate(`/list/${listId}`)}
      />
    );
  }

  return (
    <StudyRunner
      config={config}
      words={data.words}
      stats={data.stats}
      listName={data.list.name}
      isReview={isReviewMode}
      autoAdvanceMs={settings.autoAdvanceMs}
      askConfidence={config.askConfidence}
      enableHints={config.enableHints}
      onExit={(sessionId) => navigate(`/session/${sessionId}/report`)}
      onQuit={() => navigate(`/list/${listId}`)}
    />
  );
}

/**
 * Thin wrapper so the study engine mounts fresh (new queue) whenever the config
 * changes, and guards the "no eligible words" case.
 */
function StudyRunner(props: {
  config: SessionConfig;
  words: Word[];
  stats: WordStat[];
  listName: string;
  isReview: boolean;
  autoAdvanceMs: number;
  askConfidence: boolean;
  enableHints: boolean;
  onExit: (sessionId: string) => void;
  onQuit: () => void;
}) {
  // Verify there is at least one eligible word for this config.
  const hasWords = props.words.length > 0;
  if (!hasWords) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas text-center">
        <p className="text-muted">No words match this session's filters.</p>
        <button
          onClick={props.onQuit}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          Back to list
        </button>
      </div>
    );
  }
  return <StudyScreen {...props} />;
}

function FullscreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
    </div>
  );
}
