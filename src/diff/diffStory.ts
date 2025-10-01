import { StoryFile } from '../types/ast.js';

export interface StoryDiff {
  addedFiles: string[];
  removedFiles: string[];
  duplicateFileEntries: string[]; // if same file repeated across versions w/ changes? (placeholder)
  metadataChanged: Array<{ key: string; before?: string | string[]; after?: string | string[] }>;
  startChanged: boolean;
  titleChanged: boolean;
}

export function diffStory(a: StoryFile, b: StoryFile): StoryDiff {
  const setA = new Set(a.files);
  const setB = new Set(b.files);
  const addedFiles = [...setB].filter(f => !setA.has(f));
  const removedFiles = [...setA].filter(f => !setB.has(f));
  const metadataChanged: StoryDiff['metadataChanged'] = [];
  const keys = new Set([...Object.keys(a.metadata), ...Object.keys(b.metadata)]);
  for (const k of keys) {
    const va = a.metadata[k];
    const vb = b.metadata[k];
    if (JSON.stringify(va) !== JSON.stringify(vb)) metadataChanged.push({ key: k, before: va, after: vb });
  }
  return {
    addedFiles,
    removedFiles,
    duplicateFileEntries: [],
    metadataChanged,
    startChanged: a.start !== b.start,
    titleChanged: a.title !== b.title
  };
}
