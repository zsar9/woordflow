import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Story, StoryProgress } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/primitives';
import { pluralize } from '@/lib/format';
import { cn } from '@/lib/cn';

const LEVEL_TONE: Record<Story['level'], 'brand' | 'success' | 'warning' | 'danger'> = {
  A1: 'success',
  A2: 'success',
  B1: 'brand',
  B2: 'warning',
  C1: 'danger',
};

export function StoryCard({
  story,
  progress,
}: {
  story: Story;
  progress?: StoryProgress;
}) {
  const navigate = useNavigate();

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={() => navigate(`/stories/${story.id}`)}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-4 text-left shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge tone={LEVEL_TONE[story.level]}>{story.level}</Badge>
            <span className="truncate text-xs text-subtle">{story.topic}</span>
          </div>
          <h3 className="mt-1.5 truncate text-[15px] font-semibold text-ink group-hover:text-brand">
            {story.title}
          </h3>
          <p className="truncate text-xs text-subtle">{story.translatedTitle}</p>
        </div>
        {progress && progress.bestScore > 0 && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
              progress.bestScore >= 80
                ? 'bg-success/10 text-success'
                : progress.bestScore >= 55
                  ? 'bg-warning/10 text-warning'
                  : 'bg-danger/10 text-danger',
            )}
            title={`Best quiz score ${progress.bestScore}%`}
          >
            {progress.bestScore}%
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted">{story.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-subtle">
        <span className="flex items-center gap-1">
          <Icon.Book size={13} /> {story.wordCount} words
        </span>
        <span>·</span>
        <span>{pluralize(story.estMinutes, 'min')} read</span>
        <span>·</span>
        <span>{pluralize(story.quiz.length, 'question')}</span>
        {progress?.timesRead ? (
          <span className="ml-auto flex items-center gap-1 text-success">
            <Icon.Check size={13} /> Read
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}
