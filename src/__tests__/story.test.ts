import { describe, it, expect } from 'vitest';
import { parseStoryFile } from '../storymode.index.js';

const storySample = `::story: echoes_of_starlight\n  @title: Echoes of Starlight\n  @author: Ada Harrow\n  @authors: Nikhil Sato\n  files:\n    - intro.narrative\n    - main.narrative\n::end: {{ echoes_of_starlight }}\n`;

describe('story parsing', () => {
  it('parses story id, title, files and merges author metadata', () => {
    const s = parseStoryFile(storySample, 'game.story');
    expect(s.id).toBe('echoes_of_starlight');
    expect(s.title).toBe('Echoes of Starlight');
    expect(s.files).toEqual(['intro.narrative', 'main.narrative']);
    expect(s.metadata.authors).toEqual(['Ada Harrow', 'Nikhil Sato']);
  });
});
