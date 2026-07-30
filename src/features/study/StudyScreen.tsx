import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SessionConfig, Word, WordStat } from '@/types';
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
  onExit: (sessionId: string) => void;
  onQuit: () => void;
}

// Bold, unambiguous stoplight colors for the answer feedback text specifically
// (deliberately more saturated than the app's muted success/danger tokens,
// which stay as-is for buttons/badges elsewhere).
const BRIGHT_RED = '#dc2626';
const BRIGHT_GREEN = '#16a34a';

export function StudyScreen(props: Props) {
  const eng = useStudyEngine(props);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishing = useRef(false);

  // Auto-focus the input whenever we're awaiting an answer, so the user can
  // always type the next answer immediately without clicking back into it.
  //
  // This fights real, variable-timing browser behavior: the question card is
  // wrapped in <AnimatePresence mode="wait">, so the new input DOM node isn't
  // mounted until the outgoing card's exit animation finishes — and that can
  // take anywhere from ~160ms to well over a second depending on how busy the
  // browser/tab is. There's no fixed delay or frame count that's reliably
  // "long enough", so we keep retrying with no timeout... but calling
  // .focus() every single animation frame forever (even once already
  // focused) fights Framer Motion's own rAF-driven enter animation and can
  // stall it mid-fade. So: poll every frame only until focus is achieved and
  // holds for two consecutive frames, then stop — and re-arm the loop if
  // focus is ever lost again (e.g. a later "Continue" click) via the phase/
  // index deps below plus a blur listener while parked.
  useEffect(() => {
    if (eng.phase !== 'prompt') return;
    let rafId = 0;
    let stableFrames = 0;
    const tryFocus = () => {
      const el = inputRef.current;
      const isFocused = !!el && document.activeElement === el;
      if (isFocused) {
        stableFrames += 1;
        if (stableFrames >= 2) return; // settled — stop polling, no reason to keep going
      } else {
        stableFrames = 0;
        if (el && !el.disabled) el.focus();
      }
      rafId = requestAnimationFrame(tryFocus);
    };
    rafId = requestAnimationFrame(tryFocus);

    // If focus is lost again after settling (e.g. clicking a button that
    // gets removed from the DOM), restart the same polling loop.
    const onBlur = () => {
      cancelAnimationFrame(rafId);
      stableFrames = 0;
      rafId = requestAnimationFrame(tryFocus);
    };
    inputRef.current?.addEventListener('blur', onBlur);
    const el = inputRef.current;

    return () => {
      cancelAnimationFrame(rafId);
      el?.removeEventListener('blur', onBlur);
    };
  }, [eng.phase, eng.index]);

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    const session = await eng.exit();
    props.onExit(session.id);
  };

  // Finish automatically when the queue — repeats included — is exhausted.
  useEffect(() => {
    if (eng.phase === 'done') void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eng.phase]);

  const awaitingVerdict = eng.phase === 'incorrect' || eng.phase === 'almost';

  // ----- keyboard shortcuts -----
  useHotkeys({
    Enter: (e) => {
      e.preventDefault();
      if (eng.phase === 'prompt') eng.submit();
      else if (awaitingVerdict) eng.continueNext();
    },
    ' ': (e) => {
      if (awaitingVerdict) {
        e.preventDefault();
        eng.continueNext();
      }
    },
    Escape: (e) => {
      e.preventDefault();
      void finish();
    },
    Tab: (e) => {
      // Tab = "not now" → the word returns at the end of the session.
      if (eng.phase === 'prompt') {
        e.preventDefault();
        eng.skip();
      }
    },
    y: () => {
      // Y = "I was right", overriding the grader.
      if (awaitingVerdict) eng.markCorrect();
    },
    '?': (e) => {
      // Hotkeys fire even while the answer field has focus, so the hint key
      // must be one that never begins a real answer. A letter would not do:
      // 'h' would swallow the first keystroke of "hola", "hoy", "hablar"…
      if (eng.phase === 'prompt') {
        e.preventDefault();
        eng.useHint();
      }
    },
  });

  const current = eng.current;
  const dir =
    current?.direction === 'foreign-to-native'
      ? 'Translate'
      : 'Type in the target language';

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
                  {eng.isRetryRound ? 'Second look' : dir}
                  {props.isReview && ' · Mistake review'}
                </div>
                <div
                  className="mb-8 text-center font-serif text-5xl leading-tight tracking-tight text-ink sm:text-6xl"
                  dir="auto"
                >
                  {current.prompt}
                </div>

                {/* Input + feedback */}
                <FeedbackArea eng={eng} inputRef={inputRef} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer: shortcut hints */}
      <footer className="px-5 py-5">
        <ShortcutBar phase={eng.phase} />
      </footer>
    </div>
  );
}

function FeedbackArea({
  eng,
  inputRef,
}: {
  eng: ReturnType<typeof useStudyEngine>;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const isPrompt = eng.phase === 'prompt';
  const isCorrect = eng.phase === 'correct';
  const isIncorrect = eng.phase === 'incorrect';
  const isAlmost = eng.phase === 'almost';
  const showVerdict = isIncorrect || isAlmost;

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
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={eng.useHint}
              title="Hint (?)"
              className="rounded-lg p-1.5 text-subtle transition hover:bg-elevated hover:text-warning"
            >
              <Icon.Bulb size={18} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={eng.skip}
              title="Not now — asks again at the end (Tab)"
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

      {/* Correct: confirm the spelling before moving on. */}
      <AnimatePresence>
        {isCorrect && eng.current && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center"
          >
            <div className="text-sm font-medium text-success">Correct</div>
            <div
              className="font-serif text-2xl font-semibold"
              style={{ color: BRIGHT_GREEN }}
              dir="auto"
            >
              {eng.current.expected}
            </div>
            {eng.current.notes && (
              <div className="mt-1 text-xs text-muted">{eng.current.notes}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrong or near-miss: same layout as the correct case above — a short
          label, then the answer text in bold color (red for what the learner
          typed, green for the correct spelling) — plus the self-approval
          buttons underneath. */}
      <AnimatePresence>
        {showVerdict && eng.current && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center"
          >
            <div
              className={cn(
                'text-sm font-medium',
                isAlmost ? 'text-warning' : 'text-danger',
              )}
            >
              {isAlmost ? 'Very close' : 'Not quite'}
            </div>

            <div
              className="font-serif text-2xl font-semibold"
              style={{ color: BRIGHT_RED }}
              dir="auto"
            >
              {eng.input.trim() || '— nothing typed —'}
            </div>

            <div
              className="mt-1 font-serif text-2xl font-semibold"
              style={{ color: BRIGHT_GREEN }}
              dir="auto"
            >
              <DiffText given={eng.input} expected={eng.current.expected} />
            </div>

            {eng.current.notes && (
              <div className="mt-1 text-xs text-muted">{eng.current.notes}</div>
            )}

            <div className="mx-auto mt-4 flex max-w-xs flex-col gap-2 sm:flex-row">
              <button
                onClick={eng.continueNext}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition hover:brightness-125"
              >
                Continue <span className="kbd bg-white/20 text-canvas">Enter</span>
              </button>
              <button
                onClick={eng.markCorrect}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-success/50 px-4 py-2.5 text-sm font-medium text-success transition hover:bg-success/10"
              >
                <Icon.Check size={16} /> I was right{' '}
                <span className="kbd">Y</span>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-subtle">
              Continuing asks this word again later in the session.
            </p>
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
        <span key={i} className={p.ok ? '' : 'underline decoration-2 underline-offset-2'}>
          {p.char}
        </span>
      ))}
    </>
  );
}

function ShortcutBar({ phase }: { phase: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-subtle">
      {phase === 'prompt' && (
        <>
          <Hint k="Enter" label="Submit" />
          <Hint k="?" label="Hint" />
          <Hint k="Tab" label="Ask me later" />
          <Hint k="Esc" label="Exit" />
        </>
      )}
      {(phase === 'incorrect' || phase === 'almost') && (
        <>
          <Hint k="Enter" label="Continue" />
          <Hint k="Y" label="I was right" />
          <Hint k="Esc" label="Exit" />
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
