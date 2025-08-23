// Story tokenizer
import type { Diagnostic } from '../../models/types/common.types/common.types';

export interface StoryToken {
  kind: 'StoryDirective' | 'Metadata' | 'ListHeader' | 'ListItem' | 'EndDirective';
  text: string;
  line: number;
  column: number;
}

export interface TokenizeResult<T> {
  tokens: T[];
  diagnostics: Diagnostic[];
}

const STORY_ID_RE = /^::story:/;
const META_RE = /^@/;
const LIST_HEADER_RE = /^files\s*:/i;
const LIST_ITEM_RE = /^-\s+/;
const END_RE = /^::end:/;

export function tokenizeStory(content: string, file = 'inline'): TokenizeResult<StoryToken> {
  const tokens: StoryToken[] = [];
  const diagnostics: Diagnostic[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    let kind: StoryToken['kind'] | null = null;
    if (STORY_ID_RE.test(trimmed)) kind = 'StoryDirective';
    else if (END_RE.test(trimmed)) kind = 'EndDirective';
    else if (LIST_HEADER_RE.test(trimmed)) kind = 'ListHeader';
    else if (LIST_ITEM_RE.test(trimmed)) kind = 'ListItem';
    else if (META_RE.test(trimmed)) kind = 'Metadata';
    if (kind) {
      tokens.push({ kind, text: trimmed, line: lineNo, column: raw.indexOf(trimmed) + 1 });
    }
  }
  return { tokens, diagnostics };
}
