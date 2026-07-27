/**
 * Pure helper that splits a story paragraph into plain-text and glossary-term
 * tokens, so the reader UI can render inline highlights (hover for the
 * translation) without any component-level regex logic. Independent of React
 * and the database, like the rest of `lib/`.
 */

import type { StoryGlossaryEntry } from '@/types';

export interface HighlightToken {
  text: string;
  glossary?: StoryGlossaryEntry;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tokenize a paragraph against a story's glossary. Matching is
 * case-insensitive and tries longer terms first so multi-word phrases (e.g.
 * "se levanta") aren't shadowed by shorter substrings within them.
 */
export function tokenizeParagraph(
  paragraph: string,
  glossary: StoryGlossaryEntry[],
): HighlightToken[] {
  if (glossary.length === 0) return [{ text: paragraph }];

  const sorted = [...glossary].sort((a, b) => b.term.length - a.term.length);
  const pattern = sorted.map((g) => escapeRegExp(g.term)).join('|');
  const regex = new RegExp(`(${pattern})`, 'giu');
  const byLower = new Map(sorted.map((g) => [g.term.toLowerCase(), g]));

  const parts = paragraph.split(regex);
  const tokens: HighlightToken[] = [];
  for (const part of parts) {
    if (!part) continue;
    const entry = byLower.get(part.toLowerCase());
    tokens.push(entry ? { text: part, glossary: entry } : { text: part });
  }
  return tokens;
}
