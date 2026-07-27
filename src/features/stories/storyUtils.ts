/**
 * Shared helper for building `Story` records from raw content data files.
 * `wordCount`/`estMinutes` are derived here so they can never drift from the
 * actual text — each language's data file only needs to supply the raw text.
 */

import type { Story } from '@/types';

export type RawStory = Omit<Story, 'wordCount' | 'estMinutes'>;

export function finalizeStory(raw: RawStory): Story {
  const wordCount = raw.paragraphs
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  // ~100 words/minute is a comfortable pace for a learner reading aloud/slowly.
  const estMinutes = Math.max(1, Math.round(wordCount / 100));
  return { ...raw, wordCount, estMinutes };
}
