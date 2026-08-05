import type { StudyList } from '@/types';

/**
 * CEFR levels (plus the catch-all "Practical" bucket used by themed packs
 * like US Roadtrip) in the order they should sort when shown as filter chips.
 * Curriculum-authored descriptions are formatted as `${level} · ${blurb}` by
 * the installer, using an en-dash for ranges — keep that exact set in sync
 * with `src/features/curriculum/curriculum.ts`.
 */
export const LIST_LEVELS = ['A1', 'A1–A2', 'A2', 'A2–B1', 'B1', 'B1–B2', 'B2', 'Practical'] as const;

export type ListLevel = (typeof LIST_LEVELS)[number];

const LEVEL_SET = new Set<string>(LIST_LEVELS);

/**
 * Extracts the leading CEFR/Practical level from a list's description, when
 * present. Lists have no structured level field — curriculum content encodes
 * it as a `${level} · ...` prefix, so this parses that convention rather than
 * requiring a schema change. Returns undefined for user-created lists, which
 * have no such prefix.
 */
export function listLevel(list: StudyList): ListLevel | undefined {
  const desc = list.description;
  if (!desc) return undefined;
  const sep = desc.indexOf(' · ');
  if (sep === -1) return undefined;
  const prefix = desc.slice(0, sep);
  return LEVEL_SET.has(prefix) ? (prefix as ListLevel) : undefined;
}
