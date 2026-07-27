/**
 * Domain model for WoordFlow.
 *
 * These types are the single source of truth shared by the DB layer, the study
 * engine, and the UI. IDs are string UUIDs so records can be created offline and
 * merged/exported without server coordination.
 */

export type ID = string;

/** ISO language code-ish label. Free-form so users aren't boxed in. */
export type LanguageTag = string;

/** A folder in the (nestable) library tree. */
export interface Folder {
  id: ID;
  name: string;
  parentId: ID | null;
  /** Optional emoji/icon shown in the tree. */
  icon?: string;
  /** Optional accent color (hex) for visual grouping. */
  color?: string;
  /** Manual ordering within its parent. */
  order: number;
  /**
   * Stable identity for folders that ship with the app (the built-in
   * curriculum). Absent on folders the user created. Lets the installer
   * recognise its own content and never duplicate it.
   */
  sourceKey?: string;
  createdAt: number;
  updatedAt: number;
}

/** A study list ("woordenlijst"). */
export interface StudyList {
  id: ID;
  name: string;
  folderId: ID | null;
  /** The foreign language being learned. */
  language: LanguageTag;
  /** The user's native language (answer side by default). */
  nativeLanguage: LanguageTag;
  description?: string;
  category?: WordCategory;
  /**
   * Stable identity for lists that ship with the app (the built-in curriculum),
   * e.g. `curriculum.spanish.vocab.07`. Absent on lists the user created. The
   * installer skips any key it already sees, so user edits and SRS progress on
   * curriculum lists are never overwritten.
   */
  sourceKey?: string;
  createdAt: number;
  updatedAt: number;
  lastStudiedAt?: number;
  order: number;
  archived?: boolean;
}

export type WordCategory =
  | 'vocabulary'
  | 'sentences'
  | 'expressions'
  | 'grammar'
  | 'verbs'
  | 'conjugations'
  | 'listening'
  | 'custom';

export const WORD_CATEGORIES: WordCategory[] = [
  'vocabulary',
  'sentences',
  'expressions',
  'grammar',
  'verbs',
  'conjugations',
  'listening',
  'custom',
];

/**
 * A single vocabulary entry. `foreign` and `native` are the primary prompt/answer
 * strings; the *accepted* answers arrays hold synonyms & alternative spellings so
 * the validator can accept any of them.
 */
export interface Word {
  id: ID;
  listId: ID;
  /** The word in the language being learned. */
  foreign: string;
  /** The translation in the native language. */
  native: string;
  /** Extra accepted answers when prompting for the foreign word. */
  foreignAlt?: string[];
  /** Extra accepted answers when prompting for the native word. */
  nativeAlt?: string[];
  exampleSentence?: string;
  sentenceTranslation?: string;
  notes?: string;
  tags?: string[];
  category?: WordCategory;
  /** 1 (trivial) … 5 (hard). Seeds the SRS difficulty. */
  difficulty?: 1 | 2 | 3 | 4 | 5;
  bookmarked?: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;

  /* --- forward-compatible fields for future AI/media features --- */
  audioUrl?: string;
  imageUrl?: string;
}

/** Direction a question is asked in. */
export type Direction = 'foreign-to-native' | 'native-to-foreign';

/** Confidence self-report after a correct answer. */
export type Confidence = 'very-easy' | 'easy' | 'unsure' | 'guessed' | 'lucky';

export const CONFIDENCE_META: Record<
  Confidence,
  { emoji: string; label: string; factor: number }
> = {
  'very-easy': { emoji: '😀', label: 'Very easy', factor: 1.3 },
  easy: { emoji: '🙂', label: 'Easy', factor: 1.15 },
  unsure: { emoji: '😐', label: 'Unsure', factor: 0.9 },
  guessed: { emoji: '😕', label: 'Guessed', factor: 0.7 },
  lucky: { emoji: '😫', label: 'Lucky guess', factor: 0.5 },
};

/**
 * Per-word learning statistics + spaced-repetition scheduling state.
 * One row per (word) — persisted forever so progress survives sessions.
 */
export interface WordStat {
  wordId: ID;
  listId: ID;
  timesStudied: number;
  correct: number;
  incorrect: number;
  almost: number;
  skipped: number;
  hintsUsed: number;
  /** Sum of response times (ms) for computing averages. */
  totalResponseMs: number;
  /** Sum of characters typed, for typing-speed estimates. */
  totalCharsTyped: number;
  currentStreak: number;
  longestStreak: number;
  /** 0..1 mastery estimate. */
  mastery: number;
  /** 0..5 difficulty estimate maintained by the SRS. */
  difficultyScore: number;
  lastStudiedAt?: number;
  /* --- SM-2-style scheduling --- */
  /** Ease factor (min 1.3). */
  ease: number;
  /** Current inter-repetition interval in days. */
  intervalDays: number;
  /** Consecutive successful reviews (SM-2 repetition count). */
  reps: number;
  /** Timestamp (ms) when this word is next due. */
  dueAt: number;
  /** Rolling grade history (0..100), most recent last. */
  gradeHistory: number[];
}

/** Result of grading a single answer. */
export type AnswerOutcome = 'correct' | 'almost' | 'incorrect' | 'skipped';

/** A single answered question inside a session. */
export interface SessionItem {
  wordId: ID;
  direction: Direction;
  prompt: string;
  expected: string;
  given: string;
  outcome: AnswerOutcome;
  responseMs: number;
  hintsUsed: number;
  confidence?: Confidence;
  /** Whether an "almost" was manually overridden by the user (Y/N). */
  overridden?: boolean;
}

export interface StudySession {
  id: ID;
  listId: ID;
  listName: string;
  startedAt: number;
  endedAt?: number;
  direction: Direction | 'mixed';
  order: QuestionOrder;
  items: SessionItem[];
  /** Denormalized summary, filled when the session ends. */
  summary?: SessionSummary;
  /** True for auto-generated "review your mistakes" sessions. */
  isReview?: boolean;
}

export interface SessionSummary {
  total: number;
  correct: number;
  almost: number;
  incorrect: number;
  skipped: number;
  accuracy: number; // 0..100
  grade: number; // 0..100
  avgResponseMs: number;
  fastestMs: number;
  slowestMs: number;
  longestStreak: number;
  durationMs: number;
  xp: number;
  masteryGained: number;
  wordsMastered: number;
  wordsNeedingReview: number;
}

export type QuestionOrder =
  | 'sequential'
  | 'random'
  | 'hardest-first'
  | 'weakest-first'
  | 'newest-first'
  | 'least-studied'
  | 'spaced-repetition'
  | 'only-incorrect'
  | 'only-difficult'
  | 'only-bookmarked'
  | 'mixed';

export const QUESTION_ORDER_LABELS: Record<QuestionOrder, string> = {
  sequential: 'Sequential',
  random: 'Random',
  'hardest-first': 'Hardest first',
  'weakest-first': 'Weakest first',
  'newest-first': 'Newest first',
  'least-studied': 'Least studied',
  'spaced-repetition': 'Spaced repetition (due)',
  'only-incorrect': 'Only previously incorrect',
  'only-difficult': 'Only difficult',
  'only-bookmarked': 'Only bookmarked',
  mixed: 'Mixed',
};

/** Forgiveness levels for the fuzzy matcher. */
export type ForgivenessLevel = 'strict' | 'balanced' | 'lenient';

/** Configuration chosen before a session begins. */
export interface SessionConfig {
  listId: ID;
  count: number | 'all';
  direction: Direction | 'mixed';
  order: QuestionOrder;
  enableHints: boolean;
  enableFuzzy: boolean;
  forgiveness: ForgivenessLevel;
  askConfidence: boolean;
  timeLimitSec?: number; // per-question soft limit, 0/undefined = none
  onlyDifficult: boolean;
  onlyIncorrect: boolean;
  onlyNew: boolean;
  onlyBookmarked: boolean;
}

/** Global, persisted user preferences. */
export interface Settings {
  id: 'app';
  defaultDirection: Direction | 'mixed';
  defaultOrder: QuestionOrder;
  defaultCount: number | 'all';
  enableHints: boolean;
  enableFuzzy: boolean;
  forgiveness: ForgivenessLevel;
  askConfidence: boolean;
  autoAdvanceMs: number;
  ignoreArticles: boolean;
  ignoreAccents: boolean;
  ignorePunctuation: boolean;
  soundEffects: boolean;
  dailyGoalMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  defaultDirection: 'foreign-to-native',
  defaultOrder: 'spaced-repetition',
  defaultCount: 20,
  enableHints: true,
  enableFuzzy: true,
  forgiveness: 'balanced',
  askConfidence: false,
  autoAdvanceMs: 600,
  ignoreArticles: true,
  ignoreAccents: true,
  ignorePunctuation: true,
  soundEffects: false,
  dailyGoalMinutes: 15,
};

/* --------------------------- reading & stories --------------------------- */

/** CEFR-style level for a reading story. */
export type StoryLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export const STORY_LEVELS: StoryLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export const STORY_LEVEL_META: Record<StoryLevel, { label: string; description: string }> = {
  A1: { label: 'A1', description: 'Beginner' },
  A2: { label: 'A2', description: 'Elementary' },
  B1: { label: 'B1', description: 'Intermediate' },
  B2: { label: 'B2', description: 'Upper-intermediate' },
  C1: { label: 'C1', description: 'Advanced' },
};

/** A key vocabulary term surfaced alongside a story, with its translation. */
export interface StoryGlossaryEntry {
  /** The exact word/phrase as it appears in the text (used for highlighting). */
  term: string;
  translation: string;
}

export type StoryQuestionType = 'vocabulary' | 'comprehension' | 'theme';

export const STORY_QUESTION_TYPE_LABELS: Record<StoryQuestionType, string> = {
  vocabulary: 'Vocabulary',
  comprehension: 'Comprehension',
  theme: 'Subject',
};

/** A single multiple-choice question in a story's post-reading quiz. */
export interface StoryQuizQuestion {
  id: string;
  type: StoryQuestionType;
  prompt: string;
  choices: string[];
  /** Index into `choices` that is correct. */
  correctIndex: number;
}

/** A short reading passage with a vocabulary/comprehension/subject quiz. */
export interface Story {
  id: ID;
  title: string;
  translatedTitle: string;
  level: StoryLevel;
  /** The foreign language the story is written in. */
  language: LanguageTag;
  /** The language quiz choices & translations are given in. */
  nativeLanguage: LanguageTag;
  topic: string;
  summary: string;
  /** Paragraphs of the story body, in the target language. */
  paragraphs: string[];
  glossary: StoryGlossaryEntry[];
  quiz: StoryQuizQuestion[];
  estMinutes: number;
  wordCount: number;
}

/**
 * Persisted per-story progress — one row per story, keyed by storyId. Best
 * attempt is kept so the library can show a lasting badge of mastery.
 */
export interface StoryProgress {
  storyId: ID;
  timesRead: number;
  timesQuizzed: number;
  /** 0..100, best quiz score across attempts. */
  bestScore: number;
  lastScore?: number;
  lastCompletedAt?: number;
  missedQuestionIds: string[];
}

/** Aggregated daily activity used by the heatmap and streak logic. */
export interface DailyActivity {
  /** yyyy-mm-dd (local). */
  date: string;
  studyMs: number;
  answers: number;
  correct: number;
  xp: number;
}
