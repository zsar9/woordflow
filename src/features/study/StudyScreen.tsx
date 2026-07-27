import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Confidence, SessionConfig, Word, WordStat } from '@/types';
import { CONFIDENCE_META } from '@/types';
import { useStudyEngine } from './useStudyEngine';
import { useHotkeys } from '@/hooks/useHotkeys';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { diffChars } from '@/lib/validation';

interface Props {
  words: Word[];
  stats: WordStat[];
  config: SessionConfig;
  listName: string;
  isReview?: boolean;
  autoAdvanceMs: number;
  askConfidence: boolean;
  enableHints: boolean;
  onExit: (sessionId: string) => void;
  onQuit: () => void;
}

const CONFIDENCE_ORDER: Confidence[] = [
  'very-easy',
  'easy',
  'unsure',
  'guessed',
  'lucky',
];

export function StudyScreen(props: Props) {
  const eng = useStudyEngine(props);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishing = useRef(false);

  // Auto-focus the input whenever we're awaiting an answer.
  useEffect(() => {
    if (eng.phase === 'prompt') inputRef.current?.focus();
  }, [eng.phase, eng.index]);

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    const session = await eng.exit();
    props.onExit(session.id);
  };

  // Finish automatically when the queue is exhausted.
  useEffect(() => {
    if (eng.phase === 'done') void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.phase]);

  // ----- keyboard shortcuts -----
  useHotkeys(
    {
      Enter: (e) => {
        e.preventDefault();
        if (eng.phase === 'prompt') eng.submit();
        else if (eng.phase === 'incorrect') eng.continueNext();
        else if (eng.phase === 'almost') eng.confirmAlmost(true);
      },
      ' ': (e) => {
        if (eng.phase === 'incorrect' || eng.phase === 'correct') {
          e.preventDefault();
          if (eng.phase === 'incorrect') eng.continueNext();
        }
      },
      Escape: (e) => {
        e.preventDefault();
        void finish();
      },
      Tab: (e) => {
        // Tab = "I don't know" → skip, always available while answering.
        if (eng.phase === 'prompt') {
          e.preventDefault();
          eng.skip();
        }
      },
      y: () => {
        // Only meaningful once the answer field is disabled (almost phase).
        if (eng.phase === 'almost') eng.confirmAlmost(true);
      },
      n: () => {
        if (eng.phase === 'almost') eng.confirmAlmost(false);
      },
      h: (e) => {
        // Hint via keyboard only when nothing has been typed yet, so it never
        // eats an 'h' the user is typing into an answer. The on-screen button
        // works at any time.
        if (eng.phase === 'prompt' && props.enableHints && eng.input.trim() === '') {
          e.preventDefault();
          eng.useHint();
        }
      },
      s: (e) => {
        if (eng.phase === 'prompt' && eng.input.trim() === '') {
          e.preventDefault();
          eng.skip();
        }
      },
      '1': () => eng.phase === 'confidence' && eng.rateConfidence('very-easy'),
      '2': () => eng.phase === 'confidence' && eng.rateConfidence('easy'),
      '3': () => eng.phase === 'confidence' && eng.rateConfidence('unsure'),
      '4': () => eng.phase === 'confidence' && eng.rateConfidence('guessed'),
      '5': () => eng.phase === 'confidence' && eng.rateConfidence('lucky'),
    },
  );

  const current = eng.current;
  const dir = current?.direction === 'foreign-to-native' ? 'Translate' : 'Type in the target language';

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Top bar: progress + streak + exit */}
      <header className="flex items-center gap-4 px-5 py-4">
        <button
          onClick={() => void finish()}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:text-ink"
          title="Exit session (Esc)"
        >
          <Icon.X size={18} />
          <span className="hidden sm:inline">Exit</span>
        </button>

        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-brand"
            animate={{ width: `${eng.progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="tabular-nums text-muted">
            {Math.min(eng.answeredCount + 1, eng.total)}
            <span className="text-subtle"> / {eng.total}</span>
          </span>
          <span
            className={cn(
              'flex items-center gap-1 font-semibold tabular-nums',
              eng.streak >= 3 ? 'text-warning' : 'text-subtle',
            )}
            title="Current streak"
          >
            <Icon.Flame size={16} />
            {eng.streak}
          </span>
        </div>
      </header>

      {/* Main question area */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-xl">
          {current && (
            <AnimatePresence mode="wait">
              <motion.div
                key={eng.index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                <div className="eyebrow mb-2 text-center">
                  {dir}
                  {props.isReview && ' · Mistake review'}
                </div>
                <div
                  className="mb-8 text-center font-serif text-5xl leading-tight tracking-tight text-ink sm:text-6xl"
                  dir="auto"
                >
                  {current.prompt}
                </div>

                {/* Input + feedback */}
                <FeedbackArea eng={eng} inputRef={inputRef} enableHints={props.enableHints} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer: shortcut hints / confidence selector */}
      <footer className="px-5 py-5">
        {eng.phase === 'confidence' ? (
          <ConfidenceSelector onRate={eng.rateConfidence} />
        ) : (
          <ShortcutBar phase={eng.phase} enableHints={props.enableHints} />
        )}
      </footer>
    </div>
  );
}

function FeedbackArea({
  eng,
  inputRef,
  enableHints,
}: {
  eng: ReturnType<typeof useStudyEngine>;
  inputRef: React.RefObject<HTMLInputElement>;
  enableHints: boolean;
}) {
  const isPrompt = eng.phase === 'prompt';
  const isCorrect = eng.phase === 'correct';
  const isIncorrect = eng.phase === 'incorrect';
  const isAlmost = eng.phase === 'almost';

  const borderTone = isCorrect
    ? 'border-success'
    : isIncorrect
      ? 'border-danger'
      : isAlmost
        ? 'border-warning'
        : 'border-border focus-within:border-ink';

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 border-b-2 bg-transparent px-1 py-3 transition',
          borderTone,
        )}
      >
        <input
          ref={inputRef}
          value={eng.input}
          onChange={(e) => eng.setInput(e.target.value)}
          disabled={!isPrompt}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          dir="auto"
          placeholder="Type your answer…"
          className="w-full bg-transparent font-serif text-2xl text-ink outline-none placeholder:text-subtle placeholder:font-sans placeholder:text-base disabled:opacity-100"
        />
        {isPrompt && (
          <div className="flex shrink-0 items-center gap-1">
            {enableHints && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={eng.useHint}
                title="Hint (H)"
                className="rounded-lg p-1.5 text-subtle transition hover:bg-elevated hover:text-warning"
              >
                <Icon.Bulb size={18} />
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={eng.skip}
              title="Skip (Tab)"
              className="rounded-lg p-1.5 text-subtle transition hover:bg-elevated hover:text-ink"
            >
              <Icon.Skip size={18} />
            </button>
          </div>
        )}
        {isCorrect && (
          <motion.span
            className="text-success"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            <Icon.Check size={22} />
          </motion.span>
        )}
      </div>

      {/* Hint line */}
      {isPrompt && eng.hintText && (
        <div className="mt-3 text-center font-mono text-lg tracking-[0.3em] text-warning">
          {eng.hintText}
        </div>
      )}

      {/* Almost / incorrect detail */}
      <AnimatePresence>
        {(isAlmost || isIncorrect) && eng.current && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-border bg-elevated p-4">
              {isAlmost && (
                <div className="mb-2 text-sm font-medium text-warning">
                  Very close — count it as correct?
                </div>
              )}
              <div className="flex flex-col gap-2 text-sm">
                <Row label="Your answer">
                  <span className={isAlmost ? 'text-warning' : 'text-danger'} dir="auto">
                    {eng.input || '—'}
                  </span>
                </Row>
                <Row label="Correct answer">
                  <span className="font-medium text-ink" dir="auto">
                    <DiffText given={eng.input} expected={eng.current.expected} />
                  </span>
                </Row>
                {eng.current.notes && (
                  <Row label="Note">
                    <span className="text-muted">{eng.current.notes}</span>
                  </Row>
                )}
              </div>

              {isAlmost ? (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => eng.confirmAlmost(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    <Icon.Check size={16} /> Correct <span className="kbd bg-white/20 text-white">Y</span>
                  </button>
                  <button
                    onClick={() => eng.confirmAlmost(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    <Icon.X size={16} /> Incorrect <span className="kbd bg-white/20 text-white">N</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 text-center text-xs text-subtle">
                  Press <span className="kbd">Space</span> or{' '}
                  <span className="kbd">Enter</span> to continue
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DiffText({ given, expected }: { given: string; expected: string }) {
  const parts = diffChars(given, expected);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className={p.ok ? '' : 'text-danger underline decoration-danger/60'}>
          {p.char}
        </span>
      ))}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="eyebrow w-28 shrink-0">{label}</span>
      <span className="min-w-0 break-words font-serif text-lg">{children}</span>
    </div>
  );
}

function ConfidenceSelector({ onRate }: { onRate: (c: Confidence) => void }) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-subtle">
        How confident were you?
      </div>
      <div className="flex justify-center gap-2">
        {CONFIDENCE_ORDER.map((c, i) => (
          <button
            key={c}
            onClick={() => onRate(c)}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-center transition hover:border-brand hover:bg-elevated"
          >
            <span className="text-2xl">{CONFIDENCE_META[c].emoji}</span>
            <span className="text-[11px] text-muted">{CONFIDENCE_META[c].label}</span>
            <span className="kbd">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShortcutBar({
  phase,
  enableHints,
}: {
  phase: string;
  enableHints: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-subtle">
      {phase === 'prompt' && (
        <>
          <Hint k="Enter" label="Submit" />
          {enableHints && <Hint k="H" label="Hint" />}
          <Hint k="Tab" label="Skip" />
          <Hint k="Esc" label="Exit" />
        </>
      )}
      {phase === 'incorrect' && (
        <>
          <Hint k="Space" label="Continue" />
          <Hint k="Esc" label="Exit" />
        </>
      )}
      {phase === 'almost' && (
        <>
          <Hint k="Y" label="Correct" />
          <Hint k="N" label="Incorrect" />
        </>
      )}
    </div>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="kbd">{k}</span>
      {label}
    </span>
  );
}
