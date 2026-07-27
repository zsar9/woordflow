/**
 * Built-in reading library aggregator: combines every language's story data
 * into one flat, finalized list. Add a new language by creating a `data<Lang>.ts`
 * file that exports a `RawStory[]` and spreading it in below.
 */

import type { Story, StoryLevel } from '@/types';
import { finalizeStory } from './storyUtils';
import { SPANISH_RAW_STORIES } from './dataSpanish';
import { DARIJA_RAW_STORIES } from './dataDarija';

export const STORIES: Story[] = [...SPANISH_RAW_STORIES, ...DARIJA_RAW_STORIES].map(
  finalizeStory,
);

export function getStory(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

export function storiesByLevel(level: StoryLevel): Story[] {
  return STORIES.filter((s) => s.level === level);
}
