import type { Diagnostic, Cue, CharacterDialogueBlock, ActionLine } from '../common.types/common.types';

export interface Scene {
  id: string;
  title?: string;
  variantOf?: string; // normalized from @variant_of
  metadata: Record<string, any>;
  cues: Cue[];
  dialogue: CharacterDialogueBlock[]; // ordered character dialogue blocks
  actions: ActionLine[]; // inline action description lines (not cues)
  variants?: string[]; // declared variant scene ids (from end directive list)
  line: number;
  endLine?: number;
}

export interface Narrative {
  id: string;
  title?: string;
  scenes: Scene[];
  metadata: Record<string, any>;
  diagnostics: Diagnostic[];
}
