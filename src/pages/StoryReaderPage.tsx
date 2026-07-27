import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/db/db';
import { getStory } from '@/features/stories/data';
import { AddToListModal } from '@/features/stories/AddToListModal';
import { recordStoryRead, recordStoryQuizResult, recordActivity } from '@/db/repo';
import { tokenizeParagraph } from '@/lib/storyHighlight';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar, Stat } from '@/components/ui/primitives';
import { STORY_LEVEL_META, STORY_QUESTION_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/cn';
import { languageAccent } from '@/lib/languageColor';

type Phase = 'reading' | 'quiz' | 'results';

interface QuizResult {
  score: number;
  missed: string[];
}

export function StoryReaderPage() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const story = useMemo(() => (storyId ? getStory(storyId) : undefined), [storyId]);
  const progress = useLiveQuery(
    () => (storyId ? db.storyProgress.get(storyId) : undefined),
    [storyId],
  );

  const [phase, setPhase] = useState<Phase>('reading');
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);

  // Text selected by the reader in the story body, offered up for "add to list".
  const [wordSelection, setWordSelection] = useState('');
  const [showAddWord, setShowAddWord] = useState(false);

  useEffect(() => {
    if (storyId) void recordStoryRead(storyId);
    // Only meant to fire once when a story is opened, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Clear any lingering selection when leaving the reading phase.
  useEffect(() => {
    setWordSelection('');
  }, [phase]);

  // Keep the selection bar in sync as the user clicks elsewhere to deselect.
  useEffect(() => {
    const onSelectionChange = () => {
      const text = window.getSelection()?.toString().trim() ?? '';
      if (!text) setWordSelection('');
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  const handleTextSelect = () => {
    const text = window.getSelection()?.toString().trim() ?? '';
    // Ignore empty selections and accidental whole-paragraph drags.
    setWordSelection(text && text.length <= 60 ? text : '');
  };

  const clearSelection = () => {
    setWordSelection('');
    window.getSelection()?.removeAllRanges();
  };

  const suggestedTranslation = story?.glossary.find(
    (g) => g.term.toLowerCase() === wordSelection.toLowerCase(),
  )?.translation;

  if (!storyId) {
    navigate('/stories');
    return null;
  }

  if (!story) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted">Story not found.</p>
        <Button variant="secondary" onClick={() => navigate('/stories')}>
          <Icon.Back size={15} /> Back to stories
        </Button>
      </div>
    );
  }

  const startQuiz = () => {
    setQIndex(0);
    setSelected(null);
    setAnswers({});
    setLastResult(null);
    setPhase('quiz');
  };

  const question = story.quiz[qIndex];

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    setAnswers((a) => ({ ...a, [question.id]: i }));
  };

  const finishQuiz = async (finalAnswers: Record<string, number>) => {
    const missed = story.quiz
      .filter((q) => finalAnswers[q.id] !== q.correctIndex)
      .map((q) => q.id);
    const score = Math.round(
      ((story.quiz.length - missed.length) / story.quiz.length) * 100,
    );
    setLastResult({ score, missed });
    await recordStoryQuizResult(storyId, score, missed);
    await recordActivity(Date.now(), {
      studyMs: 0,
      answers: story.quiz.length,
      correct: story.quiz.length - missed.length,
      xp: (story.quiz.length - missed.length) * 8,
    });
    setPhase('results');
  };

  const next = () => {
    const isLast = qIndex + 1 >= story.quiz.length;
    setSelected(null);
    if (isLast) {
      void finishQuiz(answers);
    } else {
      setQIndex(qIndex + 1);
    }
  };

  if (phase === 'reading') {
    const accent = languageAccent(story.language);
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-1.5 text-sm text-muted">
          <button onClick={() => navigate('/stories')} className="transition hover:text-ink">
            Stories
          </button>
          <span className="text-subtle">/</span>
          <span className="truncate text-ink">{story.title}</span>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{ color: accent.hex, borderColor: accent.hex + '55', backgroundColor: accent.soft }}
          >
            {story.level}
          </span>
          <span className="text-xs text-subtle">
            {STORY_LEVEL_META[story.level].description} · {story.wordCount} words ·{' '}
            {story.estMinutes} min
          </span>
        </div>
        <h1 className="text-4xl text-ink">{story.title}</h1>
        <p className="text-sm text-subtle">{story.translatedTitle}</p>
        <p className="mt-3 text-sm text-muted">{story.summary}</p>
        <p className="mt-3 text-xs text-subtle">
          Tip: select any word or phrase below to add it to one of your lists.
        </p>

        <div
          className="mt-6 select-text space-y-4 rounded-2xl border border-border bg-surface p-6 font-serif text-lg"
          onMouseUp={handleTextSelect}
          onTouchEnd={handleTextSelect}
        >
          {story.paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed text-ink" dir="auto">
              {tokenizeParagraph(p, story.glossary).map((t, j) =>
                t.glossary ? (
                  <span
                    key={j}
                    title={t.glossary.translation}
                    className="cursor-help border-b"
                    style={{ borderColor: accent.hex + '80' }}
                  >
                    {t.text}
                  </span>
                ) : (
                  <span key={j}>{t.text}</span>
                ),
              )}
            </p>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 text-sm font-medium text-ink">Key vocabulary</div>
          <div className="flex flex-wrap gap-1.5">
            {story.glossary.map((g) => (
              <span
                key={g.term}
                title={g.translation}
                dir="auto"
                className="cursor-help select-text rounded-full border border-border bg-canvas px-2.5 py-1 text-xs text-muted"
              >
                {g.term} <span className="text-subtle">— {g.translation}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-subtle">
            {progress?.bestScore ? `Best quiz score: ${progress.bestScore}%` : 'Not quizzed yet'}
          </span>
          <Button variant="primary" size="lg" onClick={startQuiz}>
            <Icon.Play size={16} /> Take the quiz ({story.quiz.length})
          </Button>
        </div>

        {wordSelection && (
          <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
            <div className="flex max-w-full items-center gap-3 rounded-xl border border-border bg-elevated px-4 py-2.5 shadow-pop">
              <span className="max-w-[45vw] truncate text-sm text-ink" dir="auto">
                "{wordSelection}"
              </span>
              <Button size="sm" variant="primary" onClick={() => setShowAddWord(true)}>
                <Icon.Plus size={14} /> Add to list
              </Button>
              <button
                onClick={clearSelection}
                className="text-subtle transition hover:text-ink"
                aria-label="Dismiss selection"
              >
                <Icon.X size={14} />
              </button>
            </div>
          </div>
        )}

        <AddToListModal
          open={showAddWord}
          onClose={() => {
            setShowAddWord(false);
            clearSelection();
          }}
          foreign={wordSelection}
          suggestedNative={suggestedTranslation}
          language={story.language}
          nativeLanguage={story.nativeLanguage}
        />
      </div>
    );
  }

  if (phase === 'quiz') {
    const answeredFraction =
      (qIndex + (selected !== null ? 1 : 0)) / story.quiz.length;
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-subtle">
            {STORY_QUESTION_TYPE_LABELS[question.type]} · {qIndex + 1} / {story.quiz.length}
          </span>
          <button
            onClick={() => setPhase('reading')}
            className="text-xs text-muted transition hover:text-ink"
          >
            Back to story
          </button>
        </div>
        <ProgressBar value={answeredFraction} className="mb-6" />

        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="rounded-2xl border border-border bg-surface p-6"
        >
          <h2 className="text-lg font-semibold text-ink" dir="auto">
            {question.prompt}
          </h2>
          <div className="mt-5 space-y-2">
            {question.choices.map((choice, i) => {
              const isCorrect = i === question.correctIndex;
              const isSelected = i === selected;
              const revealed = selected !== null;
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={revealed}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-default',
                    !revealed && 'border-border bg-canvas text-ink hover:border-brand/50',
                    revealed && isCorrect && 'border-success/40 bg-success/10 text-success',
                    revealed &&
                      isSelected &&
                      !isCorrect &&
                      'border-danger/40 bg-danger/10 text-danger',
                    revealed &&
                      !isSelected &&
                      !isCorrect &&
                      'border-border bg-canvas text-muted opacity-60',
                  )}
                >
                  <span dir="auto">{choice}</span>
                  {revealed && isCorrect && <Icon.Check size={16} />}
                  {revealed && isSelected && !isCorrect && <Icon.X size={16} />}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <Button variant="primary" size="lg" className="mt-6 w-full" onClick={next}>
              {qIndex + 1 < story.quiz.length ? 'Next question' : 'See results'}
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  // phase === 'results'
  const score = lastResult?.score ?? progress?.lastScore ?? 0;
  const missedIds = lastResult?.missed ?? progress?.missedQuestionIds ?? [];
  const missedQuestions = story.quiz.filter((q) => missedIds.includes(q.id));

  return (
    <div className="mx-auto max-w-xl text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        <div
          className={cn(
            'mx-auto flex h-24 w-24 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-pop',
            score >= 80 ? 'bg-success' : score >= 55 ? 'bg-warning' : 'bg-danger',
          )}
        >
          {score}%
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          {score >= 80 ? 'Great reading!' : score >= 55 ? 'Good effort!' : "Let's review this one"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {story.title} · {story.quiz.length - missedQuestions.length} / {story.quiz.length} correct
        </p>
      </motion.div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Score" value={`${score}%`} />
        <Stat label="Questions" value={story.quiz.length} />
        <Stat label="Missed" value={missedQuestions.length} />
      </div>

      {missedQuestions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-left">
          <div className="mb-3 text-sm font-medium text-ink">Questions to revisit</div>
          <div className="space-y-2">
            {missedQuestions.map((q) => (
              <div key={q.id} className="rounded-lg bg-canvas px-3 py-2 text-sm">
                <div className="text-ink" dir="auto">
                  {q.prompt}
                </div>
                <div className="mt-0.5 text-xs text-success" dir="auto">
                  Answer: {q.choices[q.correctIndex]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" size="lg" className="flex-1" onClick={startQuiz}>
          <Icon.Play size={16} /> Retake quiz
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => setPhase('reading')}
        >
          Read again
        </Button>
        <Button variant="ghost" size="lg" className="flex-1" onClick={() => navigate('/stories')}>
          Back to stories
        </Button>
      </div>
    </div>
  );
}
