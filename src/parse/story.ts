import { Story } from '../model/types.js';
import { tokenize } from './tokenizer.js';

const META_RE = /^@([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/;
const STORY_ID_RE = /^::story:\s*([a-zA-Z0-9_\-]+)/;
const END_ID_RE = /^::end:\s*\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/;
const LIST_ITEM_RE = /^-\s+(.+)$/;

function normMetaKey(k: string) {
  if (k === 'author' || k === 'authors') return 'authors';
  if (k === 'copyright_holder' || k === 'copyright_holders') return 'copyright_holders';
  return k;
}

function splitList(val: string) {
  if (val.startsWith('[') && val.endsWith(']')) val = val.slice(1, -1);
  return val.split(/,\s*/).map(s => s.trim()).filter(Boolean);
}

export function parseStoryFile(content: string, file = 'inline'): Story {
  const { tokens, diagnostics } = tokenize(content, file);
  let id = '';
  const metadata: Record<string, any> = {};
  const files: string[] = [];
  let inList = false;

  for (const t of tokens) {
    switch (t.kind) {
      case 'StoryDirective': {
        const m = t.text.match(STORY_ID_RE)!;
        if (id) diagnostics.push({ code: 'SM_DUP_STORY', message: 'Duplicate story directive', severity: 'error', file, line: t.line, column: t.column });
        id = m[1];
        break;
      }
      case 'Metadata': {
        const m = t.text.match(META_RE)!;
        const key = normMetaKey(m[1]);
        const value = m[2];
        if (key === 'authors' || key === 'copyright_holders') {
          const parts = splitList(value);
          if (!metadata[key]) metadata[key] = [];
          for (const p of parts) if (!metadata[key].includes(p)) metadata[key].push(p);
        } else {
          metadata[key] = value;
        }
        break;
      }
      case 'ListHeader':
        inList = true; break;
      case 'ListItem':
        if (inList) {
          const m = t.text.match(LIST_ITEM_RE)!;
          files.push(m[1].trim());
        }
        break;
      case 'EndDirective': {
        const m = t.text.match(END_ID_RE)!;
        if (id && m[1] !== id) diagnostics.push({ code: 'SM_END_MISMATCH', message: 'End id mismatch', severity: 'error', file, line: t.line, column: t.column });
        break;
      }
    }
  }
  if (!id) diagnostics.push({ code: 'SM_NO_STORY', message: 'Missing ::story directive', severity: 'error', file, line: 1, column: 1 });
  return { id, title: metadata.title, files, metadata, diagnostics };
}
