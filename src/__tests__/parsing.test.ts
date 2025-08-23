import { describe, it, expect } from 'vitest';
import { parseStory, parseNarrative } from './parsing.js';

const storySample = `::story: echoes_of_starlight\n\n@title: Echoes of Starlight\n@authors: Ada Harrow, Nikhil Sato\n@copyright_holder: Lantern Forge Studios\n@address: 221B Nebula Ave, Orion Outpost\n@email:   contact@lanternforge.io\n@phone:   +1-555-777-4242\n@start:   intro\n\nfiles:\n- intro.narrative\n- main.narrative\n- outro.narrative\n`;

const narrativeSample = `::narrative: intro\n\n::scene: awakening\n@title: Awakening\n@location: Mango Desert\n@time: 04:32 PM\n@characters: Nova, Ken, James\n`;

describe('parsing', () => {
  it('parses story metadata', () => {
    const story = parseStory(storySample);
    expect(story.id).toBe('echoes_of_starlight');
    expect(story.title).toBe('Echoes of Starlight');
    expect(story.authors).toEqual(['Ada Harrow', 'Nikhil Sato']);
    expect(story.files).toEqual(['intro.narrative', 'main.narrative', 'outro.narrative']);
  });

  it('parses narrative with one scene', () => {
    const narrative = parseNarrative(narrativeSample);
    expect(narrative.id).toBe('intro');
    expect(narrative.scenes.length).toBe(1);
    const scene = narrative.scenes[0];
    expect(scene.id).toBe('awakening');
    expect(scene.location).toBe('Mango Desert');
    expect(scene.characters).toEqual(['Nova', 'Ken', 'James']);
  });
});
