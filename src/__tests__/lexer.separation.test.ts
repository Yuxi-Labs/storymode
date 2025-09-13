import { lexStory, lexNarrative } from '../storymodeIndex';
import { describe, it, expect } from 'vitest';

describe('lexer separation', () => {
  it('story lexer does not emit narrative/scene declarations', () => {
    const src = '::narrative: intro\n::scene: a';
    const toks = lexStory(src);
    expect(toks.some(t => t.type === 'NarrativeDecl')).toBe(false);
    expect(toks.some(t => t.type === 'SceneDecl')).toBe(false);
  });
  it('narrative lexer emits narrative decl', () => {
    const src = '::narrative: intro';
    const toks = lexNarrative(src);
    expect(toks.some(t => t.type === 'NarrativeDecl')).toBe(true);
  });
});
