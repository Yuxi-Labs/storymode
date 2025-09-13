import { parseStory, DiagnosticCodes } from '../storymodeIndex';
import { describe, it, expect } from 'vitest';

describe('story diagnostics', () => {
  it('reports missing story decl', () => {
    const src = '@title: No Decl';
    const res = parseStory(src);
    expect(res.diagnostics.some(d => d.code === DiagnosticCodes.MISSING_STORY_DECL)).toBe(true);
  });
  it('reports missing story id', () => {
    const src = '::story:\n@title: Missing Id';
    const res = parseStory(src);
    expect(res.diagnostics.some(d => d.code === DiagnosticCodes.MISSING_STORY_ID)).toBe(true);
  });
  it('reports duplicate metadata key', () => {
    const src = '::story: s\n@title: One\n@title: Two';
    const res = parseStory(src);
    const dup = res.diagnostics.filter(d => d.code === DiagnosticCodes.DUP_KEY);
    expect(dup.length).toBe(1);
  });
});
