import { describe, it, expect } from 'vitest';
import { compileStory, compileNarrative, compile, detectKind } from '../../storymode.index';

const storySample = `::story: s1\n@title: Story One\nfiles:\n - a.narrative\n::end: {{ s1 }}`;
const narrativeSample = `::narrative: n1\n::scene: sc1\n@title: Scene Title\n!sfx: [ding]\n::end: {{ sc1 }}\n::end: {{ n1 }}`;

describe('compilers', () => {
  it('compileStory returns compiled story', () => {
    const c = compileStory(storySample, 's1.story');
    expect(c.kind).toBe('story');
    expect(c.id).toBe('s1');
  });
  it('compileNarrative returns compiled narrative', () => {
    const c = compileNarrative(narrativeSample, 'n1.narrative');
    expect(c.kind).toBe('narrative');
    expect(c.scenes.length).toBe(1);
  });
  it('detectKind works', () => {
    expect(detectKind(storySample)).toBe('story');
    expect(detectKind(narrativeSample)).toBe('narrative');
    expect(detectKind('')).toBe('unknown');
  });
  it('compile orchestrator auto detects', () => {
    const s = compile(storySample);
    const n = compile(narrativeSample);
    expect(s.kind).toBe('story');
    expect(n.kind).toBe('narrative');
  });
});
