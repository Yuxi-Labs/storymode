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

export interface DialogueLine {
  text: string;
  line: number;
  column: number;
}

export interface CharacterDialogueBlock {
  character: string; // canonical uppercase id (original casing preserved? – keep as provided for now)
  lines: DialogueLine[];
  line: number; // line where character block starts
}

export interface ActionLine {
  text: string;
  line: number;
  column: number;
}
