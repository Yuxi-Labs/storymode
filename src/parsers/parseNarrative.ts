import { Diagnostic, NarrativeFile, ParseResult, Scene, Token, DiagnosticCodes } from '../types/ast.js';
import { lex } from '../lexers/lexNarrative.js';
import { validateNarrativeOrdering } from '../validation/validateNarrativeOrdering.js';

export function parseNarrative(source: string): ParseResult<NarrativeFile> {
  const tokens = lex(source);
  const diagnostics: Diagnostic[] = [];
  let idx = 0;
  function peek(offset = 0): Token { return tokens[Math.min(tokens.length - 1, idx + offset)]; }
  function consume(): Token { return tokens[idx++]; }

  // Expect NarrativeDecl
  const first = peek();
  if (first.type !== 'NarrativeDecl') {
    diagnostics.push({ message: 'Narrative file must start with ::narrative: declaration', severity: 'error', range: first.range, code: DiagnosticCodes.MISSING_NARRATIVE_DECL });
  } else { consume(); }

  let narrativeId = '';
  if (peek().type === 'Identifier') narrativeId = consume().value; else diagnostics.push({ message: 'Narrative declaration missing id', severity: 'error', range: peek().range, code: DiagnosticCodes.MISSING_NARRATIVE_ID });

  const scenes: Scene[] = [];

  while (peek().type !== 'EOF') {
    const t = peek();
    if (t.type === 'SceneDecl') {
      consume();
      let sceneId = '';
  if (peek().type === 'Identifier') sceneId = consume().value; else diagnostics.push({ message: 'Scene declaration missing id', severity: 'error', range: peek().range, code: DiagnosticCodes.MISSING_SCENE_ID });
      const meta: Record<string,string|string[]> = {};
      // collect @keys until next SceneDecl / EOF
      while (peek().type !== 'EOF' && peek().type !== 'SceneDecl') {
        if (peek().type === 'AtKey') {
          const keyTok = consume();
            let value = '';
            while (peek().type !== 'Newline' && peek().type !== 'EOF') { value += consume().value; }
            value = value.trim();
            meta[keyTok.value] = value;
            if (peek().type === 'Newline') consume();
            continue;
        }
        if (peek().type === 'Newline') { consume(); continue; }
        // skip anything else
        consume();
      }
      scenes.push({ kind: 'Scene', id: sceneId, metadata: meta, range: { start: t.range.start, end: peek().range.end } });
      continue;
    }
    // Skip tokens until a scene decl
    consume();
  }

  const ast: NarrativeFile = { kind: 'NarrativeFile', id: narrativeId, scenes, range: { start: tokens[0].range.start, end: tokens[tokens.length-1].range.end } };

  // Ordering / phase validation (extracted module)
  validateNarrativeOrdering(tokens, diagnostics);
    // Ordering / phase validation (extracted module)
    validateNarrativeOrdering(tokens, diagnostics);

  return { ast, diagnostics, tokens };
}
