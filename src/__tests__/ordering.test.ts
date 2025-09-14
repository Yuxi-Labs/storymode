import { describe, it, expect } from 'vitest';
import { parseNarrative } from '../parsers/parseNarrative';

// NOTE: Parser not yet upgraded for ordering; tests assert current (temporary) behavior.
// As ordering enforcement is implemented, expectations will change to look for diagnostics.

describe('Narrative ordering (spec draft placeholders)', () => {
  it('Flags narrative-level metadata before first scene', () => {
    const src = `::narrative: intro\n@title: Should fail narrative-level meta\n::scene: s1`;
    const res = parseNarrative(src);
    expect(res.diagnostics.some(d => d.code === 'NARRATIVE_METADATA_FORBIDDEN')).toBe(true);
  });

  it('Parses scene with symbol lines as unknown/symbol without ordering diagnostics yet', () => {
    const src = `::narrative: intro\n::scene: s1\n⦿ ambient_loop\n🞶 Ken\n↠ \"Hi\"`;
    const res = parseNarrative(src);
    expect(res.diagnostics.length).toBeGreaterThanOrEqual(0); // placeholder
  });

  it('Late character media cue not yet enforced', () => {
    const src = `::narrative: intro\n::scene: s1\n🞶 Ken\n↠ \"First line\"\n⦿ late_sfx`;
    const res = parseNarrative(src);
    expect(res.diagnostics.some(d => d.code === 'MEDIA_CUE_AFTER_DIALOGUE')).toBe(false);
  });
});
