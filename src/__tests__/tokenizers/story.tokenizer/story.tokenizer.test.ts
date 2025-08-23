import { describe, it, expect } from 'vitest';
import { tokenizeStory } from '../../../tokenizers/story.tokenizer/story.tokenizer';

describe('tokenizers/story.tokenizer', () => {
  it('tokenizes a basic story file', () => {
    const sample = `::story: test\n@title: Sample\nfiles:\n  - a.narrative\n::end: {{ test }}`;
    const { tokens } = tokenizeStory(sample, 'sample.story');
    const kinds = tokens.map(t => t.kind);
    expect(kinds).toEqual(['StoryDirective','Metadata','ListHeader','ListItem','EndDirective']);
  });
});
