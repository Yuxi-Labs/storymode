import { Narrative, Scene, Cue } from '../../models/storymode.types';
import { CharacterDialogueBlock, ActionLine } from '../../models/types/common.types/common.types';
import { tokenizeNarrative as tokenize } from '../../tokenizers/narrative.tokenizer/narrative.tokenizer';

const META_RE = /^@([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/;
// Capture raw ids (schema will validate patterns)
const NARR_ID_RE = /^::narrative:\s*(.+)$/;
const SCENE_ID_RE = /^::scene:\s*(.+)$/;
const END_ID_RE = /^::end:\s*\{\{\s*(.+?)\s*\}\}/;
const CUE_RE = /^!(sfx|music|vfx):\s*(.*)$/;
const CHARACTER_RE = /^\[\[\s*([^\]]{1,60}?)\s*\]\]$/; // [[ NAME ]]
const DIALOGUE_RE = /^"(.*)"$/; // "dialogue"
const ACTION_RE = /^!action:\s*(.*)$/i;
const END_WITH_VARIANTS_RE = /^::end:\s*\{\{\s*(.+?)\s*\}\}(.*)$/;

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
  let currentDialogue: CharacterDialogueBlock | null = null;
  // capture original lines for variant list scanning
  const allLines = content.split(/\r?\n/);

  for (const t of tokens) {
    switch (t.kind) {
      case 'NarrativeDirective': {
  const m = t.text.match(NARR_ID_RE)!;
  id = m[1].trim();
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
  current = { id: m[1].trim(), metadata: {}, cues: [], dialogue: [], actions: [], line: t.line };
  currentDialogue = null;
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
        currentDialogue = null; // cue ends any active dialogue block
        break;
      }
      case 'Action': {
        if (current) {
          const m = t.text.match(ACTION_RE)!;
          current.actions.push({ text: m[1], line: t.line, column: t.column });
        }
        currentDialogue = null;
        break;
      }
      case 'Character': {
        if (current) {
          if (currentDialogue) current.dialogue.push(currentDialogue);
          const m = t.text.match(CHARACTER_RE)!;
          const name = m[1].trim();
          currentDialogue = { character: name, lines: [], line: t.line };
        }
        break;
      }
      case 'Dialogue': {
        if (current) {
          const m = t.text.match(DIALOGUE_RE)!;
          if (!currentDialogue) {
            diagnostics.push({ code: 'SM_DIALOGUE_NO_CHARACTER', message: 'Dialogue line without preceding character block', severity: 'warning', file, line: t.line, column: t.column });
          } else {
            currentDialogue.lines.push({ text: m[1], line: t.line, column: t.column });
          }
        }
        break;
      }
      case 'EndDirective': {
        if (current) {
          // Support variant list after end directive (possibly multiline)
          let endRaw = allLines[t.line - 1].trim();
          let variants: string[] = [];
          const endMatch = endRaw.match(END_WITH_VARIANTS_RE);
          if (endMatch) {
            const endId = endMatch[1].trim();
            if (endId !== current.id) {
              diagnostics.push({ code: 'SM_SCENE_END_MISMATCH', message: `Scene end id mismatch (expected ${current.id})`, severity: 'error', file, line: t.line, column: t.column });
            }
            const tail = endMatch[2];
            if (/->/.test(tail)) {
              // inline variant list on same line
              variants = extractVariantIds(tail);
            } else if (/->\s*\[$/.test(tail) || /->\s*\[\s*$/.test(tail)) {
              // multiline list begins next line until a line with ]
              for (let li = t.line; li < allLines.length; li++) {
                const lineText = allLines[li].trim();
                if (lineText === ']') break;
                variants.push(...extractVariantIds(lineText));
              }
            }
          } else {
            const m = t.text.match(END_ID_RE)!;
            if (m[1].trim() !== current.id) {
            diagnostics.push({ code: 'SM_SCENE_END_MISMATCH', message: `Scene end id mismatch (expected ${current.id})`, severity: 'error', file, line: t.line, column: t.column });
            }
          }
          current.endLine = t.line;
          if (currentDialogue) { current.dialogue.push(currentDialogue); currentDialogue = null; }
          if (variants.length) current.variants = Array.from(new Set(variants));
          scenes.push(current);
          current = null;
        } else {
          const m = t.text.match(END_ID_RE)!;
          if (m[1].trim() !== id) {
            diagnostics.push({ code: 'SM_END_UNUSED', message: 'Unmatched ::end directive', severity: 'warning', file, line: t.line, column: t.column });
          }
        }
        break;
      }
    }
  }

  if (current) {
    if (currentDialogue) current.dialogue.push(currentDialogue);
    scenes.push(current);
  }
  if (!id) diagnostics.push({ code: 'SM_NO_NARRATIVE', message: 'Missing ::narrative directive', severity: 'error', file, line: 1, column: 1 });

  return { id, title: metadata.title, scenes, metadata, diagnostics };
}

function extractVariantIds(segment: string): string[] {
  const ids: string[] = [];
  const re = /\{\{\s*([A-Za-z0-9_\-]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(segment))) ids.push(m[1]);
  return ids;
}
