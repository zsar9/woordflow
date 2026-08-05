/**
 * The built-in curricula.
 *
 * Structure is identical for every language so a learner who finishes one can
 * start another without relearning the layout:
 *
 *   Curriculum
 *     └─ <Language>
 *          ├─ Vocabulary I   · Foundations            (lists  1–5,  A1)
 *          ├─ Vocabulary II  · Everyday Life          (lists  6–10, A1–A2)
 *          ├─ Vocabulary III · Out in the World       (lists 11–15, A2)
 *          ├─ Vocabulary IV  · Expressing Yourself    (lists 16–20, A2–B1)
 *          ├─ Sentences I    · First Conversations    (lists  1–3,  A1)
 *          ├─ Sentences II   · Getting Things Done    (lists  4–7,  A2)
 *          └─ Sentences III  · Speaking Like a Local  (lists  8–10, A2–B1)
 *
 * Order matters: each list assumes the words taught before it, and each stage
 * raises the grammatical ceiling of the sentences that follow.
 */

import type { CurriculumStage, LanguageCurriculum } from './types';
import { SPANISH_VOCABULARY } from './data/spanishVocabulary';
import { SPANISH_SENTENCES } from './data/spanishSentences';
import { DARIJA_VOCABULARY } from './data/darijaVocabulary';
import { DARIJA_SENTENCES } from './data/darijaSentences';

/** The four vocabulary stages, parameterised by language key. */
function vocabularyStages(lang: string): CurriculumStage[] {
  return [
    {
      key: `${lang}.vocab.stage1`,
      title: 'Vocabulary I · Foundations',
      level: 'A1',
      blurb:
        'Greetings, people, numbers, colours and time — the scaffolding every ' +
        'later list hangs from.',
      from: 1,
      to: 5,
    },
    {
      key: `${lang}.vocab.stage2`,
      title: 'Vocabulary II · Everyday Life',
      level: 'A1–A2',
      blurb:
        'Food, home, clothes, the body and the core verbs. After this stage you ' +
        'can describe an ordinary day.',
      from: 6,
      to: 10,
    },
    {
      key: `${lang}.vocab.stage3`,
      title: 'Vocabulary III · Out in the World',
      level: 'A2',
      blurb:
        'Travel, shopping, work, weather and health — the vocabulary of leaving ' +
        'the house and dealing with people.',
      from: 11,
      to: 15,
    },
    {
      key: `${lang}.vocab.stage4`,
      title: 'Vocabulary IV · Expressing Yourself',
      level: 'A2–B1',
      blurb:
        'Technology, adjectives, adverbs, connectors and the last high-frequency ' +
        'gaps. This is where speech starts to flow.',
      from: 16,
      to: 20,
    },
    {
      key: `${lang}.vocab.stage5`,
      title: 'Vocabulary V · Emotional & Social Life',
      level: 'B1',
      blurb:
        'Feelings, personality, relationships, sports, the arts and food culture — ' +
        'the vocabulary of a full social life.',
      from: 21,
      to: 25,
    },
    {
      key: `${lang}.vocab.stage6`,
      title: 'Vocabulary VI · Society & the Wider World',
      level: 'B1–B2',
      blurb:
        'Money and banking, news and media, the environment, government and law, ' +
        'and higher education — the vocabulary of an informed adult.',
      from: 26,
      to: 30,
    },
    {
      key: `${lang}.vocab.stage7`,
      title: 'Vocabulary VII · Precision & Nuance',
      level: 'B2',
      blurb:
        'Reflexive verbs, idioms, sharper debate vocabulary, home DIY and ' +
        'bureaucracy — the words that separate fluent from merely correct.',
      from: 31,
      to: 35,
    },
    {
      key: `${lang}.vocab.stage8`,
      title: 'Vocabulary VIII · Fluency & Range',
      level: 'B2',
      blurb:
        'Advanced science, medicine, digital life, career vocabulary and the last ' +
        'high-frequency B2 gaps — the final stretch toward real fluency.',
      from: 36,
      to: 40,
    },
    {
      key: `${lang}.vocab.stageUsRoadtrip`,
      title: 'US Roadtrip · Words',
      level: 'Practical',
      blurb:
        'Ten themed packs of practical vocabulary for a road trip across the ' +
        'United States — gas stations, diners, motels, breakdowns, parks and more.',
      from: 41,
      to: 50,
    },
  ];
}

/** The three sentence stages, parameterised by language key. */
function sentenceStages(lang: string): CurriculumStage[] {
  return [
    {
      key: `${lang}.sent.stage1`,
      title: 'Sentences I · First Conversations',
      level: 'A1',
      blurb:
        'Short, complete utterances: introducing yourself, saying where you live, ' +
        'talking about family.',
      from: 1,
      to: 3,
    },
    {
      key: `${lang}.sent.stage2`,
      title: 'Sentences II · Getting Things Done',
      level: 'A2',
      blurb:
        'Ordering, buying, travelling and working — the sentences that actually ' +
        'get you through a day abroad.',
      from: 4,
      to: 7,
    },
    {
      key: `${lang}.sent.stage3`,
      title: 'Sentences III · Speaking Like a Local',
      level: 'A2–B1',
      blurb:
        'Opinions, longer explanations and the idiomatic register natives use ' +
        'with each other.',
      from: 8,
      to: 10,
    },
    {
      key: `${lang}.sent.stageUsRoadtrip`,
      title: 'US Roadtrip · Sentences',
      level: 'Practical',
      blurb:
        'Ten themed packs of complete, natural sentences for a road trip across ' +
        'the United States — gas stations, diners, motels, breakdowns, parks and more.',
      from: 11,
      to: 20,
    },
  ];
}

export const SPANISH_CURRICULUM: LanguageCurriculum = {
  key: 'spanish',
  language: 'Spanish',
  icon: '🇪🇸',
  summary:
    'Modern European Spanish as spoken in Spain today, ordered the way people ' +
    'actually acquire a language: politeness and people first, then daily life, ' +
    'then the wider world, then the connective tissue of fluent speech.',
  tracks: [
    {
      kind: 'vocabulary',
      category: 'vocabulary',
      stages: vocabularyStages('spanish'),
      lists: SPANISH_VOCABULARY,
    },
    {
      kind: 'sentences',
      category: 'sentences',
      stages: sentenceStages('spanish'),
      lists: SPANISH_SENTENCES,
    },
  ],
};

export const DARIJA_CURRICULUM: LanguageCurriculum = {
  key: 'darija',
  language: 'Moroccan Darija',
  icon: '🇲🇦',
  summary:
    'Real spoken Moroccan Darija — the Casablanca/Rabat everyday register, not ' +
    'Modern Standard Arabic. Written in a consistent Latin transliteration ' +
    '(3 = ع, 7 = ح, kh, gh, q, sh) so every answer is typeable on any keyboard.',
  tracks: [
    {
      kind: 'vocabulary',
      category: 'vocabulary',
      stages: vocabularyStages('darija'),
      lists: DARIJA_VOCABULARY,
    },
    {
      kind: 'sentences',
      category: 'sentences',
      stages: sentenceStages('darija'),
      lists: DARIJA_SENTENCES,
    },
  ],
};

export const CURRICULA: LanguageCurriculum[] = [SPANISH_CURRICULUM, DARIJA_CURRICULUM];

/** Total entries across a language's whole path — used for the header stats. */
export function curriculumTotals(c: LanguageCurriculum) {
  const totals = { lists: 0, words: 0, sentences: 0 };
  for (const track of c.tracks) {
    totals.lists += track.lists.length;
    const n = track.lists.reduce((a, l) => a + l.entries.length, 0);
    if (track.kind === 'vocabulary') totals.words += n;
    else totals.sentences += n;
  }
  return totals;
}
