import type { Diagnostic, Cue } from '../common.types/common.types.js';

export interface Scene {
  id: string;
  title?: string;
  variantOf?: string; // normalized from @variant_of
  metadata: Record<string, any>;
  cues: Cue[];
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
