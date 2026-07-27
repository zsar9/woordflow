/**
 * Types for the built-in learning curriculum.
 *
 * The curriculum is static content that ships with the app: a designed
 * A0 → B1 path per language, split into numbered lists and grouped into
 * stages. It is installed into the user's library once (see `install.ts`)
 * and from then on behaves exactly like any list the user made themselves —
 * editable, studiable, with its own SRS progress.
 */

import type { WordCategory } from '@/types';

/** One vocabulary entry or one sentence pair. */
export interface CurriculumEntry {
  /** The target-language form the learner types. */
  foreign: string;
  /** The English translation. */
  native: string;
  /** Other accepted target-language answers. */
  foreignAlt?: string[];
  /** Other accepted English answers. */
  nativeAlt?: string[];
  /** Short usage hint shown on the word row. */
  notes?: string;
}

/** A single numbered list within a language's curriculum. */
export interface CurriculumList {
  /** Stable identity, e.g. `spanish.vocab.07`. Used to avoid re-installing. */
  key: string;
  /** 1-based position within its track (vocabulary 1–20, sentences 1–10). */
  index: number;
  title: string;
  /** One line describing what this list gets the learner to. */
  blurb: string;
  entries: CurriculumEntry[];
}

/**
 * A group of consecutive lists presented under one header, e.g.
 * "Vocabulary I · Foundations". Stages become folders in the library tree,
 * which is what gives the dashboard its headers.
 */
export interface CurriculumStage {
  /** Stable identity, e.g. `spanish.vocab.stage1`. */
  key: string;
  /** Header shown in the library, e.g. "Vocabulary I · Foundations". */
  title: string;
  /** CEFR band this stage sits in, e.g. "A1" or "A2–B1". */
  level: string;
  /** One line on what the stage is for. */
  blurb: string;
  /** Which list indexes belong to this stage (inclusive range endpoints). */
  from: number;
  to: number;
}

/** One track (vocabulary or sentences) of a language's curriculum. */
export interface CurriculumTrack {
  kind: 'vocabulary' | 'sentences';
  category: WordCategory;
  stages: CurriculumStage[];
  lists: CurriculumList[];
}

/** The complete designed path for one language. */
export interface LanguageCurriculum {
  /** Stable identity, e.g. `spanish`. */
  key: string;
  /** Language label stored on every list (drives the accent colour). */
  language: string;
  /** Flag emoji for the language folder. */
  icon: string;
  /** One paragraph describing the path, shown in the curriculum header. */
  summary: string;
  tracks: CurriculumTrack[];
}
