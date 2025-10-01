import { parseStory, parseNarrative, lexStory, lexNarrative } from '../storymodeIndex.js';
import { describe, it, expect } from 'vitest';

describe('Unicode / Chinese support', () => {
  it('parses story with Chinese id and metadata key/value', () => {
    const src = `::story: 星辰传奇\n@标题: 星河之旅\nfiles:\n- 第一章.narrative`; // note: file names still parsed as identifiers; resolution policy external
    const res = parseStory(src);
    expect(res.ast?.id).toBe('星辰传奇');
    expect(res.diagnostics.length).toBe(0);
  });
  it('parses narrative + scene with Chinese ids', () => {
    const src = `::narrative: 第一章\n::scene: 序幕\n@地点: 沙漠`;
    const res = parseNarrative(src);
    expect(res.ast?.id).toBe('第一章');
    expect(res.ast?.scenes[0].id).toBe('序幕');
  });
  it('lexers emit Identifier tokens for Chinese sequences', () => {
    const storyToks = lexStory('::story: 故事一');
    expect(storyToks.some(t => t.type==='Identifier' && t.value==='故事一')).toBe(true);
    const narrativeToks = lexNarrative('::narrative: 第一章');
    expect(narrativeToks.some(t => t.type==='Identifier' && t.value==='第一章')).toBe(true);
  });
});
