// StoryMode DSL AST core (diagnostics & positions imported for SoC)
import { Position, Range, Diagnostic, DiagnosticSeverity, DiagnosticCodes, DiagnosticCode } from './diagnostics';
export { Position, Range, Diagnostic, DiagnosticSeverity, DiagnosticCodes, DiagnosticCode } from './diagnostics';
export interface BaseNode { kind: string; range: Range; }
export interface StoryFile extends BaseNode { kind: 'StoryFile'; id: string; title?: string; metadata: Record<string,string|string[]>; files: string[]; start?: string; }
export interface NarrativeFile extends BaseNode { kind: 'NarrativeFile'; id: string; scenes: Scene[]; }

// Extended scene model (incremental adoption): existing parser currently only fills
// id + metadata. Additional arrays are optional to allow forward compatibility.
export interface Scene extends BaseNode {
	kind: 'Scene';
	id: string;
	metadata: Record<string,string|string[]>;
	globalMedia?: MediaCue[];        // Phase 2
	characters?: CharacterBlock[];   // Phase 3
	paragraphs?: ParagraphBlock[];   // Phase 4
	gotos?: Goto[];                  // Phase 5
	notes?: NoteNode[];              // Phase 6
}

export interface MediaCue extends BaseNode { kind: 'MediaCue'; mediaType: 'sfx'|'vfx'|'music'|'cam'; id: string; scope: 'global'|'character'; }
export interface CharacterBlock extends BaseNode { kind: 'CharacterBlock'; name: string; metadata: Record<string,string|string[]>; media: MediaCue[]; lines: CharacterLine[]; }
export type CharacterLine = DialogueLine | ThoughtLine;
export interface DialogueLine extends BaseNode { kind: 'DialogueLine'; text: string; continuation?: boolean; }
export interface ThoughtLine extends BaseNode { kind: 'ThoughtLine'; text: string; }
export interface ParagraphBlock extends BaseNode { kind: 'ParagraphBlock'; id?: string; lines: string[]; }
export interface Goto extends BaseNode { kind: 'Goto'; target: string; }
export interface NoteNode extends BaseNode { kind: 'Note'; noteType: 'inline'|'block'|'line'; text: string; exportable: boolean; }
export interface ParseResult<T> { ast?: T; diagnostics: Diagnostic[]; tokens?: Token[]; }
// TokenType will expand as new symbolic constructs are lexed. For now we add
// placeholder symbol types to allow incremental lexer evolution without
// breaking existing parsing logic.
export type TokenType =
	| 'StoryDecl'
	| 'NarrativeDecl'
	| 'SceneDecl'
	| 'Identifier'
	| 'AtKey'
	| 'Colon'
	| 'Dash'
	| 'ListItem'
	| 'Newline'
	| 'Whitespace'
	| 'EOF'
	| 'FilesSection'
	| 'Symbol'        // generic unicode symbol (future refinement)
	| 'Unknown';
export interface Token { type: TokenType; value: string; range: Range; }
