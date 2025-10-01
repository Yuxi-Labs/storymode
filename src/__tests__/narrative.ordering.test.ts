import { parseNarrative, DiagnosticCodes, Diagnostic } from '../storymodeIndex.js';
import { describe, it, expect } from 'vitest';

// Focused tests ensuring extracted ordering validator still runs via parseNarrative.
describe('narrative ordering validation', () => {
  it('flags metadata before first scene', () => {
    const src = '::narrative: intro\n@foo: value\n';
    const res = parseNarrative(src);
  expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.NARRATIVE_METADATA_FORBIDDEN)).toBe(true);
  });

  it('flags media after characters (OUT_OF_ORDER_PHASE)', () => {
    // Using symbol placeholders from lexer (will be generic Symbol tokens). We simulate with unknown ordering by placing paragraph then media
    const src = '::narrative: intro\n::scene: s1\n\u00b6\n\u29bf'; // paragraph then media => out of order
    const res = parseNarrative(src);
  expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.OUT_OF_ORDER_PHASE)).toBe(true);
  });
});
