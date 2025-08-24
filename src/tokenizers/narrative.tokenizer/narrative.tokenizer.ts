// Narrative tokenizer
import type { Diagnostic } from '../../models/types/common.types/common.types';

export interface NarrativeToken {
  kind: 'NarrativeDirective' | 'SceneDirective' | 'Metadata' | 'Cue' | 'EndDirective' | 'Character' | 'Dialogue' | 'Action';
  text: string;
  line: number;
  column: number;
}

export interface TokenizeResult<T> {
  tokens: T[];
  diagnostics: Diagnostic[];
}

const NARRATIVE_RE = /^::narrative:/;
const SCENE_RE = /^::scene:/;
const META_RE = /^@/;
const CUE_RE = /^!(sfx|music|vfx):/;
const CHARACTER_RE = /^\[\[/; // starts with [[ and ends with ]]
const DIALOGUE_RE = /^".*"$/; // simplistic dialogue line in quotes
const ACTION_RE = /^!action:/i;
const END_RE = /^::end:/;

export function tokenizeNarrative(content: string, file = 'inline'): TokenizeResult<NarrativeToken> {
  const tokens: NarrativeToken[] = [];
  const diagnostics: Diagnostic[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    let kind: NarrativeToken['kind'] | null = null;
    if (NARRATIVE_RE.test(trimmed)) kind = 'NarrativeDirective';
    else if (SCENE_RE.test(trimmed)) kind = 'SceneDirective';
    else if (END_RE.test(trimmed)) kind = 'EndDirective';
  else if (CUE_RE.test(trimmed)) kind = 'Cue';
  else if (CHARACTER_RE.test(trimmed) && /\]\]$/.test(trimmed)) kind = 'Character';
  else if (DIALOGUE_RE.test(trimmed)) kind = 'Dialogue';
  else if (ACTION_RE.test(trimmed)) kind = 'Action';
    else if (META_RE.test(trimmed)) kind = 'Metadata';
    if (kind) {
      tokens.push({ kind, text: trimmed, line: lineNo, column: raw.indexOf(trimmed) + 1 });
    }
  }
  return { tokens, diagnostics };
}
