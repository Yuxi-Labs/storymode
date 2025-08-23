import { Narrative, Scene, Cue } from '../../models/storymode.types.js';
import { tokenize } from '../tokenizer.js';

const META_RE = /^@([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/;
const NARR_ID_RE = /^::narrative:\s*([a-zA-Z0-9_\-]+)/;
const SCENE_ID_RE = /^::scene:\s*([a-zA-Z0-9_\-]+)/;
const END_ID_RE = /^::end:\s*\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/;
const CUE_RE = /^!(sfx|music|vfx):\s*(.*)$/;

function normMetaKey(k: string) {
  if (k === 'variant_of') return 'variant_of';
  return k;
}

function splitList(val: string) {
  if (val.startsWith('[') && val.endsWith(']')) val = val.slice(1, -1);
  return val.split(/,\s*/).map(s => s.trim()).filter(Boolean);
}

export function parseNarrativeFile(content: string, file = 'inline'): Narrative {
  const { tokens, diagnostics } = tokenize(content, file);
  let id = '';
  const metadata: Record<string, any> = {};
  const scenes: Scene[] = [];
  let current: Scene | null = null;

  for (const t of tokens) {
    switch (t.kind) {
      case 'NarrativeDirective': {
        const m = t.text.match(NARR_ID_RE)!;
        id = m[1];
        break;
      }
      case 'Metadata': {
        const m = t.text.match(META_RE)!;
        const key = normMetaKey(m[1]);
        const value = m[2];
        if (current) {
          if (key === 'variant_of') current.variantOf = value;
          else if (key === 'title') current.title = value;
          else current.metadata[key] = value;
        } else {
          if (key === 'title') metadata.title = value;
          else metadata[key] = value;
        }
        break;
      }
      case 'SceneDirective': {
        const m = t.text.match(SCENE_ID_RE)!;
        if (current) scenes.push(current);
        current = { id: m[1], metadata: {}, cues: [], line: t.line };
        break;
      }
      case 'Cue': {
        if (current) {
          const m = t.text.match(CUE_RE)!;
          const type = m[1] as Cue['type'];
          const rawVal = m[2].trim();
          const items = rawVal ? splitList(rawVal) : [];
          current.cues.push({ type, items, line: t.line, column: t.column });
        }
        break;
      }
      case 'EndDirective': {
        if (current) {
          const m = t.text.match(END_ID_RE)!;
          if (m[1] !== current.id) {
            diagnostics.push({ code: 'SM_SCENE_END_MISMATCH', message: `Scene end id mismatch (expected ${current.id})`, severity: 'error', file, line: t.line, column: t.column });
          }
          current.endLine = t.line;
          scenes.push(current);
          current = null;
        } else {
          const m = t.text.match(END_ID_RE)!;
          if (m[1] !== id) {
            diagnostics.push({ code: 'SM_END_UNUSED', message: 'Unmatched ::end directive', severity: 'warning', file, line: t.line, column: t.column });
          }
        }
        break;
      }
    }
  }

  if (current) scenes.push(current);
  if (!id) diagnostics.push({ code: 'SM_NO_NARRATIVE', message: 'Missing ::narrative directive', severity: 'error', file, line: 1, column: 1 });

  return { id, title: metadata.title, scenes, metadata, diagnostics };
}
