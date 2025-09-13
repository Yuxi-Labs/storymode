import { Diagnostic, ParseResult, StoryFile, Token, DiagnosticCodes } from '../types/ast';
import { lexStory } from '../lexers/lexStory';

export function parseStory(source: string): ParseResult<StoryFile> {
  const tokens = lexStory(source);
  const diagnostics: Diagnostic[] = [];

  let idx = 0;
  function peek(offset = 0): Token { return tokens[Math.min(tokens.length - 1, idx + offset)]; }
  function consume(): Token { return tokens[idx++]; }
  function expect(type: Token['type'], message: string) {
    const t = peek();
    if (t.type !== type) {
      diagnostics.push({ message, severity: 'error', range: t.range, code: 'EXPECTED_'+type });
      return undefined as any;
    }
    return consume();
  }

  // Expect StoryDecl
  const first = peek();
  if (first.type !== 'StoryDecl') {
    diagnostics.push({ message: 'Story file must start with ::story: declaration', severity: 'error', range: first.range, code: DiagnosticCodes.MISSING_STORY_DECL });
  } else {
    consume();
  }

  let storyId = '';
  if (peek().type === 'Identifier') {
    storyId = consume().value;
  } else {
    diagnostics.push({ message: 'Story declaration missing id', severity: 'error', range: peek().range, code: DiagnosticCodes.MISSING_STORY_ID });
  }

  const metadata: Record<string,string|string[]> = {};
  const files: string[] = [];
  let startArc: string | undefined;
  let title: string | undefined;

  while (true) {
    const t = peek();
    if (t.type === 'EOF') break;
    if (t.type === 'AtKey') {
      const keyToken = consume();
      // gather value until newline
      let value = '';
      while (peek().type !== 'Newline' && peek().type !== 'EOF') { value += consume().value; }
      value = value.trim();
      if (keyToken.value === 'title') title = value;
      else if (keyToken.value === 'start') startArc = value;
      if (metadata[keyToken.value]) {
  diagnostics.push({ message: `Duplicate metadata key @${keyToken.value}`, severity: 'warning', range: keyToken.range, code: DiagnosticCodes.DUP_KEY });
      }
      metadata[keyToken.value] = value;
      if (peek().type === 'Newline') consume();
      continue;
    }
    if (t.type === 'FilesSection') {
      consume(); // files
      // expect colon
      if (peek().type === 'Colon') consume();
      // consume optional newline
      if (peek().type === 'Newline') consume();
      // parse dash list
      while (peek().type === 'Dash') {
        consume();
        let fname = '';
        while (peek().type !== 'Newline' && peek().type !== 'EOF') { fname += consume().value; }
        fname = fname.trim();
        if (fname) files.push(fname);
        if (peek().type === 'Newline') consume();
      }
      continue;
    }
    // skip others
    consume();
  }

  const ast: StoryFile = {
    kind: 'StoryFile',
    id: storyId,
    title,
    metadata,
    files,
    start: startArc,
    range: { start: tokens[0].range.start, end: tokens[tokens.length-1].range.end }
  };

  return { ast, diagnostics, tokens };
}
