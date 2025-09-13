import { parseStory, parseNarrative } from '../storymodeIndex';
import { describe, it, expect } from 'vitest';

const storySample = `::story: echoes_of_starlight\n@title: Echoes of Starlight\n@start: intro\nfiles:\n- intro.narrative\n`;
const narrativeSample = `::narrative: intro\n\n::scene: awakening\n@title: Awakening\n@location: Desert\n`;

describe('parsing', () => {
  it('parses story', () => {
  const res = parseStory(storySample);
    expect(res.ast?.id).toBe('echoes_of_starlight');
    expect(res.diagnostics.length).toBe(0);
  });
  it('parses narrative', () => {
    const res = parseNarrative(narrativeSample);
    expect(res.ast?.id).toBe('intro');
    expect(res.ast?.scenes.length).toBe(1);
  });
  // project compilation removed per design choice
});
