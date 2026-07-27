import type * as React from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { STORIES } from '@/features/stories/data';
import { StoryCard } from '@/features/stories/StoryCard';
import { STORY_LEVELS, STORY_LEVEL_META, type StoryLevel } from '@/types';
import { EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export function StoriesPage() {
  const [level, setLevel] = useState<StoryLevel | 'all'>('all');
  const progressList = useLiveQuery(() => db.storyProgress.toArray(), [], []);

  const progressById = useMemo(
    () => new Map((progressList ?? []).map((p) => [p.storyId, p])),
    [progressList],
  );

  const visible = useMemo(
    () => (level === 'all' ? STORIES : STORIES.filter((s) => s.level === level)),
    [level],
  );

  const readCount = (progressList ?? []).filter((p) => p.timesRead > 0).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Stories</h1>
        <p className="mt-0.5 text-sm text-muted">
          Read short stories from A1 to C1, then test yourself on the vocabulary, content
          and subject.
          {readCount > 0 && ` You've read ${readCount} so far.`}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <LevelChip active={level === 'all'} onClick={() => setLevel('all')}>
          All levels
        </LevelChip>
        {STORY_LEVELS.map((l) => (
          <LevelChip key={l} active={level === l} onClick={() => setLevel(l)}>
            {l} · {STORY_LEVEL_META[l].description}
          </LevelChip>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Icon.Book size={32} />} title="No stories at this level yet" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((story) => (
            <StoryCard key={story.id} story={story} progress={progressById.get(story.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LevelChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-border bg-surface text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
