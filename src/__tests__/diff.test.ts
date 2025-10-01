import { diffStory, diffNarrative, StoryFile, NarrativeFile } from '../storymodeIndex.js';
import { describe, it, expect } from 'vitest';

function mkStory(id: string, files: string[], meta: Record<string,string|string[]> = {}, start?: string, title?: string): StoryFile {
  return { kind: 'StoryFile', id, files, metadata: meta, start, title, range: { start: { offset:0,line:1,column:1}, end:{offset:0,line:1,column:1} } };
}
function mkNarrative(id: string, scenes: { id: string; metadata?: Record<string,string|string[]> }[]): NarrativeFile {
  return { kind: 'NarrativeFile', id, scenes: scenes.map((s,i) => ({ kind:'Scene', id: s.id, metadata: s.metadata||{}, range:{start:{offset:i,line:i+1,column:1}, end:{offset:i,line:i+1,column:1}} })), range:{start:{offset:0,line:1,column:1}, end:{offset:0,line:1,column:1}} };
}

describe('diff utilities', () => {
  it('diffStory detects added/removed files and metadata changes', () => {
    const a = mkStory('s', ['a.narrative','b.narrative'], { title:['One'] }, 'a.narrative', 'TitleA');
    const b = mkStory('s', ['b.narrative','c.narrative'], { title:['Two'] }, 'b.narrative', 'TitleB');
    const d = diffStory(a,b);
    expect(d.addedFiles).toEqual(['c.narrative']);
    expect(d.removedFiles).toEqual(['a.narrative']);
    expect(d.metadataChanged.some(c => c.key==='title')).toBe(true);
    expect(d.startChanged).toBe(true);
    expect(d.titleChanged).toBe(true);
  });
  it('diffNarrative detects added/removed/modified scenes', () => {
    const a = mkNarrative('n', [{id:'s1', metadata:{ mood:'calm'}}, {id:'s2'}]);
    const b = mkNarrative('n', [{id:'s1', metadata:{ mood:'tense'}}, {id:'s3'}]);
    const d = diffNarrative(a,b);
    expect(d.addedScenes.map(s=>s.id)).toEqual(['s3']);
    expect(d.removedScenes.map(s=>s.id)).toEqual(['s2']);
    expect(d.modifiedScenes.some(m => m.id==='s1' && m.metadataChanged.length===1)).toBe(true);
  });
});
