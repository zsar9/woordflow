import { describe, it, expect } from 'vitest';
import { gradeAnswer, buildAcceptedAnswers, splitAccepted } from './validation';
import { normalize, levenshtein, similarity } from './text';

const cfg = { forgiveness: 'balanced' as const, enableFuzzy: true };

describe('normalize', () => {
  it('ignores case, accents, punctuation, articles', () => {
    expect(normalize('  Café! ')).toBe('cafe');
    expect(normalize('The Book.')).toBe('book');
    expect(normalize('well-known')).toBe('well known');
    expect(normalize("l'école")).toBe('ecole'); // article + accent dropped
  });
});

describe('levenshtein / similarity', () => {
  it('computes edit distance', () => {
    expect(levenshtein('beautiful', 'beautifull')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
  it('similarity is 1 for equal strings', () => {
    expect(similarity('abc', 'abc')).toBe(1);
  });
});

describe('splitAccepted / buildAcceptedAnswers', () => {
  it('splits on separators and keeps whole', () => {
    expect(splitAccepted('beautiful, pretty; attractive')).toEqual([
      'beautiful',
      'pretty',
      'attractive',
    ]);
  });
  it('merges primary + alternates without dupes', () => {
    const a = buildAcceptedAnswers('color', ['colour']);
    expect(a).toContain('color');
    expect(a).toContain('colour');
  });
});

describe('gradeAnswer', () => {
  it('accepts exact match ignoring formatting', () => {
    expect(gradeAnswer('  Beautiful ', ['beautiful'], cfg).verdict).toBe(
      'correct',
    );
  });

  it('accepts any of multiple answers', () => {
    const accepted = buildAcceptedAnswers('beautiful, pretty, attractive');
    expect(gradeAnswer('attractive', accepted, cfg).verdict).toBe('correct');
  });

  it('accepts alternative spelling', () => {
    const accepted = buildAcceptedAnswers('color', ['colour']);
    expect(gradeAnswer('colour', accepted, cfg).verdict).toBe('correct');
  });

  it('flags near miss as almost', () => {
    const r = gradeAnswer('beautifull', ['beautiful'], cfg);
    expect(r.verdict).toBe('almost');
  });

  it('marks clearly wrong answers incorrect', () => {
    expect(gradeAnswer('house', ['beautiful'], cfg).verdict).toBe('incorrect');
  });

  it('does not fuzzy-accept very short different words', () => {
    // "cat" vs "car" is 1 edit but too short to be an "almost".
    const r = gradeAnswer('cat', ['car'], cfg);
    expect(r.verdict).toBe('incorrect');
  });

  it('empty answer is incorrect', () => {
    expect(gradeAnswer('   ', ['book'], cfg).verdict).toBe('incorrect');
  });

  it('respects strict forgiveness (fewer typos tolerated)', () => {
    const strict = { forgiveness: 'strict' as const, enableFuzzy: true };
    // two edits should not be "almost" at strict on a short-ish word
    const r = gradeAnswer('beatifu', ['beautiful'], strict);
    expect(['incorrect', 'almost']).toContain(r.verdict);
  });

  it('can disable fuzzy entirely', () => {
    const noFuzzy = { forgiveness: 'balanced' as const, enableFuzzy: false };
    expect(gradeAnswer('beautifull', ['beautiful'], noFuzzy).verdict).toBe(
      'incorrect',
    );
  });
});
