// Shared parsing utilities for StoryMode (placed at repo root src, no 'core' naming)

export interface StoryMeta {
  id: string;            // echoes_of_starlight
  title?: string;        // Echoes of Starlight
  authors?: string[];
  copyright_holder?: string;
  address?: string;
  email?: string;
  phone?: string;
  start?: string;        // intro
  files?: string[];      // list of narrative filenames
  raw: string;           // original file content
}

export interface SceneMeta {
  id: string;            // awakening
  title?: string;
  location?: string;
  time?: string;
  characters?: string[];
  tone?: string;
  mood?: string;
  [key: string]: any;
}

export interface NarrativeData {
  id: string;            // intro
  scenes: SceneMeta[];
  raw: string;
}

const STORY_ID_RE = /^::story:\s*([a-z0-9_\-]+)\s*$/i;
const NARRATIVE_ID_RE = /^::narrative:\s*([a-z0-9_\-]+)\s*$/i;
const SCENE_ID_RE = /^::scene:\s*([a-z0-9_\- ]+)\s*$/i;
const META_RE = /^@([a-zA-Z0-9_]+):\s*(.*)$/;

export function parseStory(content: string): StoryMeta {
  const lines = content.split(/\r?\n/);
  let id = '';
  const meta: Partial<StoryMeta> = { raw: content } as any;
  const files: string[] = [];
  let inFiles = false;
  for (const line of lines) {
    if (!id) {
      const m = line.match(STORY_ID_RE);
      if (m) { id = m[1]; continue; }
    }
    if (line.trim() === 'files:') { inFiles = true; continue; }
    if (inFiles && line.trim().startsWith('- ')) {
      files.push(line.trim().slice(2));
      continue;
    }
    const metaMatch = line.match(META_RE);
    if (metaMatch) {
      const key = metaMatch[1];
      const value = metaMatch[2].trim();
      if (key === 'authors') meta.authors = value.split(/,\s*/);
      else if (key === 'files') {/* ignore list-style 'files:' handled above */}
      else (meta as any)[key] = value;
    }
  }
  meta.id = id;
  meta.files = files.length ? files : undefined;
  return meta as StoryMeta;
}

export function parseNarrative(content: string): NarrativeData {
  const lines = content.split(/\r?\n/);
  let id = '';
  const scenes: SceneMeta[] = [];
  let current: SceneMeta | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!id) {
      const m = line.match(NARRATIVE_ID_RE);
      if (m) { id = m[1]; continue; }
    }
    const sceneMatch = line.match(SCENE_ID_RE);
    if (sceneMatch) {
      if (current) scenes.push(current);
      current = { id: sceneMatch[1].replace(/\s+/g, '_') } as SceneMeta;
      continue;
    }
    const metaMatch = line.match(META_RE);
    if (metaMatch && current) {
      const key = metaMatch[1];
      const value = metaMatch[2].trim();
      if (key === 'characters') current.characters = value.split(/,\s*/);
      else (current as any)[key] = value;
    }
  }
  if (current) scenes.push(current);
  return { id, scenes, raw: content };
}
