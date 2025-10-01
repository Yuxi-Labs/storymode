import { parseNarrative, DiagnosticCodes, Diagnostic } from '../storymodeIndex.js';
import { describe, it, expect } from 'vitest';

describe('narrative diagnostics', () => {
  it('reports missing narrative decl', () => {
    const src = '@title: no decl';
    const res = parseNarrative(src);
  expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.MISSING_NARRATIVE_DECL)).toBe(true);
  });
  it('reports missing narrative id', () => {
    const src = '::narrative:\n';
    const res = parseNarrative(src);
  expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.MISSING_NARRATIVE_ID)).toBe(true);
  });
  it('reports missing scene id', () => {
    const src = '::narrative: intro\n::scene:';
    const res = parseNarrative(src);
  expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.MISSING_SCENE_ID)).toBe(true);
  });
});
