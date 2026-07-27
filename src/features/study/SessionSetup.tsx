import type * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Direction, SessionConfig, Settings, StudyList } from '@/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

interface Props {
  list: StudyList;
  wordCount: number;
  settings: Settings;
  onStart: (config: SessionConfig) => void;
  onCancel: () => void;
}

const DIRECTIONS: { value: Direction | 'mixed'; label: string }[] = [
  { value: 'foreign-to-native', label: 'Foreign → Native' },
  { value: 'native-to-foreign', label: 'Native → Foreign' },
  { value: 'mixed', label: 'Mixed' },
];

/**
 * Everything except the question direction is now fixed, because the defaults
 * were the only sensible answers: the whole list is always quizzed, the order
 * is always random, answer checking is always balanced (with an "I was right"
 * override during the session), and hints are always available.
 */
export function SessionSetup({ list, wordCount, settings, onStart, onCancel }: Props) {
  const [direction, setDirection] = useState<Direction | 'mixed'>(
    settings.defaultDirection,
  );

  const start = () => {
    onStart({
      listId: list.id,
      count: 'all',
      direction,
      order: 'random',
      enableHints: true,
      enableFuzzy: true,
      forgiveness: 'balanced',
      askConfidence: false,
      onlyDifficult: false,
      onlyIncorrect: false,
      onlyNew: false,
      onlyBookmarked: false,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-soft"
      >
        <button
          onClick={onCancel}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
        >
          <Icon.Back size={16} /> Back
        </button>

        <h1 className="text-xl font-semibold tracking-tight text-ink">{list.name}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {list.language} · all {wordCount} words, in random order
        </p>

        <div className="mt-6">
          <Group label="Direction">
            <div className="flex flex-wrap gap-1.5">
              {DIRECTIONS.map((d) => (
                <Chip
                  key={d.value}
                  active={direction === d.value}
                  onClick={() => setDirection(d.value)}
                >
                  {d.label}
                </Chip>
              ))}
            </div>
          </Group>
        </div>

        <ul className="mt-5 space-y-1.5 text-sm text-muted">
          <Rule>Every word in the list is asked — nothing is sampled.</Rule>
          <Rule>Anything you get wrong or postpone comes back at the end.</Rule>
          <Rule>Hints are always one keypress away, and you can overrule the marking.</Rule>
        </ul>

        <Button
          variant="primary"
          size="lg"
          className="mt-6 w-full"
          onClick={start}
          disabled={wordCount === 0}
        >
          <Icon.Play size={17} /> Start studying
        </Button>
        <p className="mt-2 text-center text-xs text-subtle">
          Tip: everything works from the keyboard — just start typing.
        </p>
      </motion.div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
      <span>{children}</span>
    </li>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-40',
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-border bg-surface text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
