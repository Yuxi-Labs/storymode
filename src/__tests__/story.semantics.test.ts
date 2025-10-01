import { parseStory, validateStorySemantics, Diagnostic, DiagnosticCodes } from '../storymodeIndex.js';
import { describe, it, expect } from 'vitest';

describe('story semantic validation', () => {
  it('flags duplicate file entries and missing start target', () => {
    const src = `::story: s\n@start: missing.narrative\nfiles:\n- a.narrative\n- a.narrative`;
    const res = parseStory(src);
    validateStorySemantics(res.ast!, res.diagnostics, { fileExists: () => true });
    expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.DUP_FILE_ENTRY)).toBe(true);
    expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.MISSING_START_TARGET)).toBe(true);
  });
  it('flags unresolved file', () => {
    const src = `::story: s\nfiles:\n- x.narrative`;
    const res = parseStory(src);
    validateStorySemantics(res.ast!, res.diagnostics, { fileExists: () => false });
    expect(res.diagnostics.some((d: Diagnostic) => d.code === DiagnosticCodes.UNRESOLVED_FILE)).toBe(true);
  });
});
