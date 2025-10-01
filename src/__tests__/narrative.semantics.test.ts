import { parseNarrative, validateNarrativeSemantics, Diagnostic, DiagnosticCodes } from '../storymodeIndex.js';
import { describe, it, expect } from 'vitest';

describe('narrative semantic validation', () => {
  it('flags duplicate scene id', () => {
    const src = `::narrative: n\n::scene: a\n::scene: a`;
    const res = parseNarrative(src);
    validateNarrativeSemantics(res.ast!, res.diagnostics);
    expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.DUP_SCENE_ID)).toBe(true);
  });
});
