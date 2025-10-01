import { NarrativeFile, Scene } from '../types/ast.js';

export interface SceneDiffChange {
  id: string;
  metadataChanged: Array<{ key: string; before?: string | string[]; after?: string | string[] }>;
}
export interface NarrativeDiff {
  addedScenes: Scene[];
  removedScenes: Scene[];
  modifiedScenes: SceneDiffChange[];
}

export function diffNarrative(a: NarrativeFile, b: NarrativeFile): NarrativeDiff {
  const mapA = new Map(a.scenes.map(s => [s.id, s] as const));
  const mapB = new Map(b.scenes.map(s => [s.id, s] as const));
  const addedScenes: Scene[] = [];
  const removedScenes: Scene[] = [];
  const modifiedScenes: SceneDiffChange[] = [];
  for (const [id, sceneB] of mapB) {
    const sceneA = mapA.get(id);
    if (!sceneA) { addedScenes.push(sceneB); continue; }
    // metadata diff only for now
    const keys = new Set([...Object.keys(sceneA.metadata), ...Object.keys(sceneB.metadata)]);
    const metadataChanged: SceneDiffChange['metadataChanged'] = [];
    for (const k of keys) {
      const va = sceneA.metadata[k];
      const vb = sceneB.metadata[k];
      if (JSON.stringify(va) !== JSON.stringify(vb)) metadataChanged.push({ key: k, before: va, after: vb });
    }
    if (metadataChanged.length) modifiedScenes.push({ id, metadataChanged });
  }
  for (const [id, sceneA] of mapA) {
    if (!mapB.has(id)) removedScenes.push(sceneA);
  }
  return { addedScenes, removedScenes, modifiedScenes };
}
