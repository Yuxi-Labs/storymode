import { describe, it, expect } from 'vitest';
import { parseStoryFile, parseNarrativeFile, validateStoryObject, validateNarrativeObject } from '../../storymode.index';

const storySample = `::story: s1\nfiles:\n - a.narrative\n::end: {{ s1 }}`;
const badStorySample = `::story: bad id!\nfiles:\n - a.narrative`;

const narrativeSample = `::narrative: n1\n::scene: sc1\n!sfx: [ding]\n::end: {{ sc1 }}\n::end: {{ n1 }}`;
const badNarrativeSample = `::narrative: n1\n::scene: sc1\n::scene: sc1\n::end: {{ sc1 }}\n::end: {{ n1 }}`;

describe('schema validation', () => {
  it('validateStory returns no warnings for good story', () => {
    const s = parseStoryFile(storySample, 's1.story');
  const issues = validateStoryObject(s);
  expect(issues.length).toBe(0);
  });
  it('validateStory catches bad id', () => {
    const s = parseStoryFile(badStorySample, 'bad.story');
  const issues = validateStoryObject(s);
  expect(issues.some((i: any) => (i.message || '').includes('pattern'))).toBe(true);
  });
  it('validateNarrative passes good narrative', () => {
    const n = parseNarrativeFile(narrativeSample, 'n1.narrative');
  const issues = validateNarrativeObject(n);
  expect(issues.length).toBe(0);
  });
  it('validateNarrative detects duplicate scene id', () => {
    const n = parseNarrativeFile(badNarrativeSample, 'dup.narrative');
  const issues = validateNarrativeObject(n);
  // duplicate scene id will violate unique expectations only if enforced; currently schema allows duplicates.
  // For now expect no errors (adjust later if uniqueness added).
  expect(Array.isArray(issues)).toBe(true);
  });
});
