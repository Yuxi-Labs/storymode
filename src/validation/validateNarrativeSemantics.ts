import { NarrativeFile, Diagnostic, DiagnosticCodes, Scene } from '../types/ast.js';

export interface NarrativeSemanticsOptions {}

export function validateNarrativeSemantics(narrative: NarrativeFile, diagnostics: Diagnostic[], _opts: NarrativeSemanticsOptions = {}): void {
  const seen = new Map<string, Scene>();
  for (const scene of narrative.scenes) {
    if (!scene.id) continue; // already has parsing diagnostic
    if (seen.has(scene.id)) {
      diagnostics.push({ message: `Duplicate scene id '${scene.id}'`, severity: 'error', range: scene.range, code: DiagnosticCodes.DUP_SCENE_ID });
    } else {
      seen.set(scene.id, scene);
    }
  }
}
