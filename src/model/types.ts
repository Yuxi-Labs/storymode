export interface Diagnostic {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  column: number;
}

export interface Cue {
  type: 'sfx' | 'music' | 'vfx';
  items: string[];
  line: number;
  column: number;
}

export interface Scene {
  id: string;
  title?: string;
  variantOf?: string;
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

export interface Story {
  id: string;
  title?: string;
  files: string[];
  metadata: Record<string, any>;
  diagnostics: Diagnostic[];
}
