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
import { languageAccent } from '@/lib/languageColor';
import { useT } from '@/hooks/useT';

export function StoriesPage() {
  const [level, setLevel] = useState<StoryLevel | 'all'>('all');
  const [language, setLanguage] = useState<string | 'all'>('all');
  const progressList = useLiveQuery(() => db.storyProgress.toArray(), [], []);
  const t = useT();

  const progressById = useMemo(
    () => new Map((progressList ?? []).map((p) => [p.storyId, p])),
    [progressList],
  );

  // Languages present in the library, in first-seen order.
  const languages = useMemo(() => {
    const seen: string[] = [];
    for (const s of STORIES) if (!seen.includes(s.language)) seen.push(s.language);
    return seen;
  }, []);

  const visible = useMemo(
    () =>
      STORIES.filter(
        (s) => (level === 'all' || s.level === level) && (language === 'all' || s.language === language),
      ),
    [level, language],
  );

  // Grouped by language so different languages' stories don't blur together.
  const groups = useMemo(() => {
    const byLang = new Map<string, typeof STORIES>();
    for (const s of visible) {
      const arr = byLang.get(s.language) ?? [];
      arr.push(s);
      byLang.set(s.language, arr);
    }
    // Keep the same first-seen ordering as the filter chips.
    return languages
      .filter((l) => byLang.has(l))
      .map((l) => ({ language: l, stories: byLang.get(l)! }));
  }, [visible, languages]);

  const readCount = (progressList ?? []).filter((p) => p.timesRead > 0).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('stories.title')}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {t('stories.subtitle')}
          {readCount > 0 && ` ${t('stories.readSoFar')} ${readCount} ${t('stories.soFar')}`}
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {languages.map((l) => (
          <LevelChip key={l} active={language === l} onClick={() => setLanguage(language === l ? 'all' : l)}>
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: languageAccent(l).hex }}
            />
            {l}
          </LevelChip>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <LevelChip active={level === 'all'} onClick={() => setLevel('all')}>
          {t('stories.allLevels')}
        </LevelChip>
        {STORY_LEVELS.map((l) => (
          <LevelChip key={l} active={level === l} onClick={() => setLevel(l)}>
            {l} · {STORY_LEVEL_META[l].description}
          </LevelChip>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Icon.Book size={32} />} title={t('stories.empty')} />
      ) : (
        <div className="space-y-8">
          {groups.map(({ language: lang, stories }) => {
            const accent = languageAccent(lang);
            return (
              <div key={lang}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: accent.hex }}
                  />
                  <h2 className="text-lg font-semibold text-ink">{lang}</h2>
                  <span className="text-sm text-subtle">
                    {stories.length} {stories.length === 1 ? t('stories.story') : t('stories.stories')}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {stories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      progress={progressById.get(story.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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
