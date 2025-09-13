// Diagnostic types separated from AST node definitions for SoC.
export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export interface Position { offset: number; line: number; column: number; }
export interface Range { start: Position; end: Position; }
export interface Diagnostic { message: string; severity: DiagnosticSeverity; range: Range; code?: string; }

// Central list of diagnostic codes for reference and tooling.
export const DiagnosticCodes = {
	MISSING_STORY_DECL: 'MISSING_STORY_DECL',
	MISSING_STORY_ID: 'MISSING_STORY_ID',
	MISSING_NARRATIVE_DECL: 'MISSING_NARRATIVE_DECL',
	MISSING_NARRATIVE_ID: 'MISSING_NARRATIVE_ID',
	MISSING_SCENE_ID: 'MISSING_SCENE_ID',
	DUP_KEY: 'DUP_KEY'
} as const;
export type DiagnosticCode = typeof DiagnosticCodes[keyof typeof DiagnosticCodes];
