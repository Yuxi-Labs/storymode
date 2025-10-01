import { Diagnostic, Token, DiagnosticCodes } from '../types/ast.js';

/*
 * Narrative ordering / phase validation extracted from parseNarrative for reuse.
 * Maintains same diagnostic emission semantics and order.
 */
export interface NarrativeOrderingOptions {
  // future toggles could disable certain phases or relax rules
}

interface OrderState { phase: number; inCharacter: boolean; characterHasDialogue: boolean; seenFirstScene: boolean; }

function classifySymbol(sym: string): { kind: string; phase: number } | undefined {
  switch (sym) {
    case '\u29bf': case '\u2b1f': case '\u266c': case '\u29c8': return { kind: 'media', phase: 2 }; // assorted media cues
    case '\ud83d\udfb6': return { kind: 'character', phase: 3 }; // musical symbol (placeholder for character block start)
    case '\u21a0': case '\u21aa': return { kind: 'dialogue', phase: 3 }; // dialogue arrows
    case '\u2235': return { kind: 'thought', phase: 3 }; // therefore symbol used for thoughts
    case '\u00b6': return { kind: 'paragraph', phase: 4 }; // pilcrow
    case '\u21dd': return { kind: 'goto', phase: 5 }; // rightwards squiggle arrow
    case '\u270e': return { kind: 'note', phase: 6 }; // pencil
    default: return undefined;
  }
}

export function validateNarrativeOrdering(tokens: Token[], diagnostics: Diagnostic[], _options: NarrativeOrderingOptions = {}): void {
  const state: OrderState = { phase: 1, inCharacter: false, characterHasDialogue: false, seenFirstScene: false };
  function enterPhase(newPhase: number, token: Token) {
    if (newPhase < state.phase) {
      diagnostics.push({ message: 'Construct appears after later phase started', severity: 'error', range: token.range, code: DiagnosticCodes.OUT_OF_ORDER_PHASE });
    } else if (newPhase > state.phase) {
      state.phase = newPhase;
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
}
