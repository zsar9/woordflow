/**
 * The built-in curriculum.
 *
 * Moroccan Darija only — Spanish and the original Darija vocabulary/sentence
 * tracks were removed on 2026-10-20 per the user's request to keep only
 * lists made in the last 7 days. The remaining tracks are additive, each
 * with its own stage(s):
 *
 *   Curriculum
 *     └─ Moroccan Darija
 *          ├─ Verbs · More Everyday Verbs
 *          ├─ Conjugation Drill · Present Tense
 *          ├─ 100 Basic Verbs (4 lists)
 *          ├─ Top 10 Verbs · Present, Past & Future (3 lists)
 *          └─ Beginner Essentials (10 lists: topics, connectors, more verbs)
 */

import type { CurriculumStage, LanguageCurriculum } from './types';
import { DARIJA_VERBS, DARIJA_CONJUGATIONS } from './data/darijaVerbs';
import { DARIJA_VERBS_100 } from './data/darijaVerbs100';
import { DARIJA_CONJUGATION_10 } from './data/darijaConjugation10';
import { DARIJA_BEGINNER } from './data/darijaBeginner';

/**
 * The verb/conjugation stages — a short, standalone pair of lists: a second
 * wave of bare verbs, then a dedicated present-tense conjugation drill, so
 * conjugated forms are their own quizzable entries rather than only
 * appearing inside other words' usage notes.
 */
function verbStages(lang: string): CurriculumStage[] {
  return [
    {
      key: `${lang}.verbs.stage1`,
      title: 'Verbs · More Everyday Verbs',
      level: 'A2',
      blurb:
        'A second wave of high-frequency bare verbs that did not fit in the ' +
        'original Everyday Verbs list.',
      from: 1,
      to: 1,
    },
  ];
}

function conjugationStages(lang: string): CurriculumStage[] {
  return [
    {
      key: `${lang}.conj.stage1`,
      title: 'Conjugation Drill · Present Tense',
      level: 'A2',
      blurb:
        'Present-tense conjugations of verbs you already know, spelled out ' +
        'across ana, nta, howa and 7na as their own quizzable entries.',
      from: 1,
      to: 1,
    },
  ];
}

/**
 * Present / past / future conjugation drill for the 10 most-used verbs,
 * one stage spanning all three tense lists.
 */
function conjugation10Stages(lang: string): CurriculumStage[] {
  return [
    {
      key: `${lang}.conj10.stage1`,
      title: 'Top 10 Verbs · Present, Past & Future',
      level: 'A2',
      blurb:
        'The present, past and future of the 10 verbs you will reach for the ' +
        'most — want, do, say, go, come, eat, write, know, work, drink — ' +
        'across ana, nta, howa and 7na.',
      from: 1,
      to: 3,
    },
  ];
}

/**
 * The 100 essential basic verbs, as one dedicated stage spanning all four
 * 25-verb lists.
 */
function basicVerbs100Stages(lang: string): CurriculumStage[] {
  return [
    {
      key: `${lang}.verbs100.stage1`,
      title: '100 Basic Verbs',
      level: 'A1–A2',
      blurb:
        'The 100 verbs that cover the overwhelming majority of what you need ' +
        'to say in basic Darija, gathered into one place and split into four ' +
        '25-verb lists.',
      from: 1,
      to: 4,
    },
  ];
}

/**
 * Beginner essentials — 10 topic/connector/verb lists, one stage spanning
 * all of them.
 */
function beginnerStages(lang: string): CurriculumStage[] {
  return [
    {
      key: `${lang}.beginner.stage1`,
      title: 'Beginner Essentials',
      level: 'A1',
      blurb:
        'Ten 30-word lists for someone just starting out: everyday topics ' +
        '(animals, weather, the house, technology, jobs, hobbies, school, ' +
        'health), the connector words needed to build real sentences, and ' +
        'another wave of common verbs.',
      from: 1,
      to: 10,
    },
  ];
}

export const DARIJA_CURRICULUM: LanguageCurriculum = {
  key: 'darija',
  language: 'Moroccan Darija',
  icon: '🇲🇦',
  summary:
    'Real spoken Moroccan Darija — the Casablanca/Rabat everyday register, not ' +
    'Modern Standard Arabic. Written in a consistent Latin transliteration ' +
    '(3 = ع, 7 = ح, 9 = ق, kh, gh, sh) so every answer is typeable on any keyboard.',
  tracks: [
    {
      kind: 'verbs',
      category: 'verbs',
      stages: verbStages('darija'),
      lists: DARIJA_VERBS,
    },
    {
      kind: 'conjugations',
      category: 'conjugations',
      stages: conjugationStages('darija'),
      lists: DARIJA_CONJUGATIONS,
    },
    {
      kind: 'verbs',
      category: 'verbs',
      stages: basicVerbs100Stages('darija'),
      lists: DARIJA_VERBS_100,
    },
    {
      kind: 'conjugations',
      category: 'conjugations',
      stages: conjugation10Stages('darija'),
      lists: DARIJA_CONJUGATION_10,
    },
    {
      kind: 'vocabulary',
      category: 'vocabulary',
      stages: beginnerStages('darija'),
      lists: DARIJA_BEGINNER,
    },
  ],
};

export const CURRICULA: LanguageCurriculum[] = [DARIJA_CURRICULUM];

/** Total entries across a language's whole path — used for the header stats. */
export function curriculumTotals(c: LanguageCurriculum) {
  const totals = { lists: 0, words: 0, sentences: 0 };
  for (const track of c.tracks) {
    totals.lists += track.lists.length;
    const n = track.lists.reduce((a, l) => a + l.entries.length, 0);
    if (track.kind === 'sentences') totals.sentences += n;
    else totals.words += n;
  }
  return totals;
}
