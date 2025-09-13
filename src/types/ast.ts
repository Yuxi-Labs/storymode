// StoryMode DSL AST core (diagnostics & positions imported for SoC)
import { Position, Range, Diagnostic, DiagnosticSeverity, DiagnosticCodes, DiagnosticCode } from './diagnostics';
export { Position, Range, Diagnostic, DiagnosticSeverity, DiagnosticCodes, DiagnosticCode } from './diagnostics';
export interface BaseNode { kind: string; range: Range; }
export interface StoryFile extends BaseNode { kind: 'StoryFile'; id: string; title?: string; metadata: Record<string,string|string[]>; files: string[]; start?: string; }
export interface NarrativeFile extends BaseNode { kind: 'NarrativeFile'; id: string; scenes: Scene[]; }
export interface Scene extends BaseNode { kind: 'Scene'; id: string; metadata: Record<string,string|string[]>; }
export interface ParseResult<T> { ast?: T; diagnostics: Diagnostic[]; tokens?: Token[]; }
export type TokenType = 'StoryDecl' | 'NarrativeDecl' | 'SceneDecl' | 'Identifier' | 'AtKey' | 'Colon' | 'Dash' | 'ListItem' | 'Newline' | 'Whitespace' | 'EOF' | 'FilesSection' | 'Unknown';
export interface Token { type: TokenType; value: string; range: Range; }
