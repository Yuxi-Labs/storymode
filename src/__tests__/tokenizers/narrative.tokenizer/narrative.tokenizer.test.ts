import { describe, it, expect } from 'vitest';
import { tokenizeNarrative } from '../../../tokenizers/narrative.tokenizer/narrative.tokenizer';

describe('tokenizers/narrative.tokenizer', () => {
  it('tokenizes a narrative with one scene and cue', () => {
    const sample = `::narrative: act1\n::scene: intro\n@title: Intro\n!sfx: [beep]\n::end: {{ intro }}\n::end: {{ act1 }}`;
    const { tokens } = tokenizeNarrative(sample, 'act1.narrative');
    const kinds = tokens.map(t => t.kind);
    expect(kinds).toEqual(['NarrativeDirective','SceneDirective','Metadata','Cue','EndDirective','EndDirective']);
  });
});
