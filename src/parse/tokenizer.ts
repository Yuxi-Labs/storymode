import { Diagnostic } from '../model/types.js';

export type TokenKind =
  | 'StoryDirective'
  | 'NarrativeDirective'
  | 'SceneDirective'
  | 'EndDirective'
  | 'Metadata'
  | 'ListHeader'
  | 'ListItem'
  | 'Cue'
  | 'Blank'
  | 'Unknown';

export interface Token {
  kind: TokenKind;
  text: string;
  line: number;
  column: number;
  indent: number;
  raw: string;
}

const STORY_RE = /^::story:\s*([a-zA-Z0-9_\-]+)/;
const NARR_RE = /^::narrative:\s*([a-zA-Z0-9_\-]+)/;
const SCENE_RE = /^::scene:\s*([a-zA-Z0-9_\-]+)/;
const END_RE = /^::end:\s*\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/;
const META_RE = /^@([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/;
const LIST_HEADER_RE = /^(files):$/;
const LIST_ITEM_RE = /^-\s+(.+)$/;
const CUE_RE = /^!(sfx|music|vfx):\s*(.*)$/;

export function tokenize(content: string, file: string) {
  const lines = content.split(/\r?\n/);
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  lines.forEach((raw, i) => {
    const lineNum = i + 1;
    if (raw.trim() === '') {
      tokens.push({ kind: 'Blank', text: '', line: lineNum, column: 1, indent: 0, raw });
      return;
    }
    const indentMatch = raw.match(/^(\s*)/)!;
    const indentSpaces = indentMatch[1].replace(/\t/g, '  ');
    const indent = indentSpaces.length;
    const trimmed = raw.trimStart();
    const column = raw.length - trimmed.length + 1;
    let kind: TokenKind = 'Unknown';
    if (STORY_RE.test(trimmed)) kind = 'StoryDirective';
    else if (NARR_RE.test(trimmed)) kind = 'NarrativeDirective';
    else if (SCENE_RE.test(trimmed)) kind = 'SceneDirective';
    else if (END_RE.test(trimmed)) kind = 'EndDirective';
    else if (META_RE.test(trimmed)) kind = 'Metadata';
    else if (LIST_HEADER_RE.test(trimmed)) kind = 'ListHeader';
    else if (LIST_ITEM_RE.test(trimmed)) kind = 'ListItem';
    else if (CUE_RE.test(trimmed)) kind = 'Cue';

    if (indent % 2 !== 0) {
      diagnostics.push({
        code: 'SM_INDENT',
        message: 'Indentation not multiple of 2 spaces',
        severity: 'warning',
        file,
        line: lineNum,
        column: 1,
      });
    }

    tokens.push({ kind, text: trimmed, line: lineNum, column, indent, raw });
  });
  return { tokens, diagnostics };
}
