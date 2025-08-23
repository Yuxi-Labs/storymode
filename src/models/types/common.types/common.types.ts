// Common/shared model types
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
