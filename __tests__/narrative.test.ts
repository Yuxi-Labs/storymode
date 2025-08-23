import { describe, it, expect } from 'vitest';
import { parseNarrativeFile } from '../src/index.js';

const narrativeSample = `::narrative: act1\n  @title: Act I - Fractures\n\n    ::scene: arrival\n      @title: Arrival at the Archive\n      !sfx: [terminal_beep]\n    ::end: {{ arrival }}\n::end: {{ act1 }}\n`;

describe('narrative parsing', () => {
  it('parses narrative id, title, and a scene with cue', () => {
    const n = parseNarrativeFile(narrativeSample, 'sample.narrative');
    expect(n.id).toBe('act1');
    expect(n.title).toBe('Act I - Fractures');
    expect(n.scenes.length).toBe(1);
    expect(n.scenes[0].id).toBe('arrival');
    expect(n.scenes[0].cues[0].type).toBe('sfx');
  });
});
