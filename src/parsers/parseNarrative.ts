import { Diagnostic, NarrativeFile, ParseResult, Scene, Token, DiagnosticCodes } from '../types/ast';
import { lex } from '../lexers/lexNarrative';

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

  // --- Inline ordering validation (formerly validateNarrativeOrdering) ---
  interface OrderState { phase: number; inCharacter: boolean; characterHasDialogue: boolean; seenFirstScene: boolean; }
  const state: OrderState = { phase: 1, inCharacter: false, characterHasDialogue: false, seenFirstScene: false };
  function enterPhase(newPhase: number, token: Token) {
    if (newPhase < state.phase) {
      diagnostics.push({ message: 'Construct appears after later phase started', severity: 'error', range: token.range, code: DiagnosticCodes.OUT_OF_ORDER_PHASE });
    } else if (newPhase > state.phase) {
      state.phase = newPhase;
    }
  }
  function classifySymbol(sym: string): { kind: string; phase: number } | undefined {
    switch (sym) {
      case '⦿': case '⬟': case '♬': case '⧈': return { kind: 'media', phase: 2 };
      case '🞶': return { kind: 'character', phase: 3 };
      case '↠': case '↪': return { kind: 'dialogue', phase: 3 };
      case '∵': return { kind: 'thought', phase: 3 };
      case '¶': return { kind: 'paragraph', phase: 4 };
      case '⇝': return { kind: 'goto', phase: 5 };
      case '✎': return { kind: 'note', phase: 6 };
      default: return undefined;
    }
  }

  for (const t of tokens) {
    if (t.type === 'SceneDecl') { state.seenFirstScene = true; state.phase = 1; state.inCharacter = false; state.characterHasDialogue = false; continue; }
    if (!state.seenFirstScene) {
      if (t.type === 'AtKey') diagnostics.push({ message: 'Metadata at narrative top level is forbidden', severity: 'error', range: t.range, code: DiagnosticCodes.NARRATIVE_METADATA_FORBIDDEN });
      continue;
    }
    if (t.type === 'AtKey') {
      if (state.phase > 1) diagnostics.push({ message: 'Metadata only allowed at start of scene (Phase 1)', severity: 'error', range: t.range, code: DiagnosticCodes.OUT_OF_ORDER_PHASE });
      continue;
    }
    if (t.type === 'Symbol') {
      const sym = classifySymbol(t.value);
      if (!sym) { diagnostics.push({ message: `Unknown symbol '${t.value}'`, severity: 'warning', range: t.range, code: DiagnosticCodes.UNKNOWN_SYMBOL }); continue; }
      switch (sym.kind) {
        case 'media': {
          if (state.inCharacter) {
            if (state.characterHasDialogue) diagnostics.push({ message: 'Character media cue after dialogue not allowed', severity: 'error', range: t.range, code: DiagnosticCodes.MEDIA_CUE_AFTER_DIALOGUE });
            else enterPhase(3, t);
          } else {
            if (state.phase > 2) diagnostics.push({ message: 'Global media after characters not allowed', severity: 'error', range: t.range, code: DiagnosticCodes.OUT_OF_ORDER_PHASE });
            else enterPhase(2, t);
          }
          break;
        }
        case 'character': { enterPhase(3, t); state.inCharacter = true; state.characterHasDialogue = false; break; }
        case 'dialogue': case 'thought': {
          if (!state.inCharacter) {
            diagnostics.push({ message: 'Dialogue/thought outside character block', severity: 'error', range: t.range, code: DiagnosticCodes.OUT_OF_ORDER_PHASE });
          } else { enterPhase(3, t); state.characterHasDialogue = true; }
          break; }
        case 'paragraph': { state.inCharacter = false; state.characterHasDialogue = false; enterPhase(4, t); break; }
        case 'goto': { state.inCharacter = false; state.characterHasDialogue = false; enterPhase(5, t); break; }
        case 'note': { state.inCharacter = false; state.characterHasDialogue = false; enterPhase(6, t); break; }
      }
    }
  }
  // --- End inline ordering validation ---

  return { ast, diagnostics, tokens };
}
