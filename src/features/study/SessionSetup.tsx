import type * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  QUESTION_ORDER_LABELS,
  type Direction,
  type ForgivenessLevel,
  type QuestionOrder,
  type SessionConfig,
  type Settings,
  type StudyList,
} from '@/types';
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

const COUNTS: (number | 'all')[] = [10, 20, 50, 100, 'all'];
const DIRECTIONS: { value: Direction | 'mixed'; label: string }[] = [
  { value: 'foreign-to-native', label: 'Foreign → Native' },
  { value: 'native-to-foreign', label: 'Native → Foreign' },
  { value: 'mixed', label: 'Mixed' },
];
const FORGIVENESS: ForgivenessLevel[] = ['strict', 'balanced', 'lenient'];
const ORDERS: QuestionOrder[] = [
  'spaced-repetition',
  'sequential',
  'random',
  'weakest-first',
  'hardest-first',
  'least-studied',
  'newest-first',
  'only-incorrect',
  'only-difficult',
  'only-bookmarked',
];

export function SessionSetup({ list, wordCount, settings, onStart, onCancel }: Props) {
  const [count, setCount] = useState<number | 'all'>(settings.defaultCount);
  const [direction, setDirection] = useState<Direction | 'mixed'>(settings.defaultDirection);
  const [order, setOrder] = useState<QuestionOrder>(settings.defaultOrder);
  const [enableHints, setEnableHints] = useState(settings.enableHints);
  const [enableFuzzy, setEnableFuzzy] = useState(settings.enableFuzzy);
  const [forgiveness, setForgiveness] = useState<ForgivenessLevel>(settings.forgiveness);
  const [askConfidence, setAskConfidence] = useState(settings.askConfidence);
  const [onlyDifficult, setOnlyDifficult] = useState(false);
  const [onlyIncorrect, setOnlyIncorrect] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);

  const start = () => {
    onStart({
      listId: list.id,
      count,
      direction,
      order,
      enableHints,
      enableFuzzy,
      forgiveness,
      askConfidence,
      onlyDifficult,
      onlyIncorrect,
      onlyNew,
      onlyBookmarked: order === 'only-bookmarked',
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
          {list.language} · {wordCount} words available
        </p>

        <div className="mt-6 space-y-5">
          <Group label="How many">
            <div className="flex flex-wrap gap-1.5">
              {COUNTS.map((c) => (
                <Chip
                  key={String(c)}
                  active={count === c}
                  onClick={() => setCount(c)}
                >
                  {c === 'all' ? 'All' : c}
                </Chip>
              ))}
            </div>
          </Group>

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

          <Group label="Order">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as QuestionOrder)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              {ORDERS.map((o) => (
                <option key={o} value={o}>
                  {QUESTION_ORDER_LABELS[o]}
                </option>
              ))}
            </select>
          </Group>

          <Group label="Answer checking">
            <div className="flex flex-wrap gap-1.5">
              {FORGIVENESS.map((f) => (
                <Chip
                  key={f}
                  active={forgiveness === f}
                  disabled={!enableFuzzy}
                  onClick={() => setForgiveness(f)}
                >
                  {f[0].toUpperCase() + f.slice(1)}
                </Chip>
              ))}
            </div>
          </Group>

          <div className="grid grid-cols-2 gap-2">
            <Toggle label="Hints" checked={enableHints} onChange={setEnableHints} />
            <Toggle label="Fuzzy matching" checked={enableFuzzy} onChange={setEnableFuzzy} />
            <Toggle label="Ask confidence" checked={askConfidence} onChange={setAskConfidence} />
            <Toggle label="Only difficult" checked={onlyDifficult} onChange={setOnlyDifficult} />
            <Toggle label="Only incorrect" checked={onlyIncorrect} onChange={setOnlyIncorrect} />
            <Toggle label="Only new" checked={onlyNew} onChange={setOnlyNew} />
          </div>
        </div>

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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition',
        checked ? 'border-brand/40 bg-brand/5 text-ink' : 'border-border text-muted',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition',
          checked ? 'bg-brand' : 'bg-elevated',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}
