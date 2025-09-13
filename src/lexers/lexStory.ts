import { Position, Range, Token, TokenType } from '../types/ast';

function makePos(offset: number, line: number, column: number): Position { return { offset, line, column }; }
function makeRange(start: Position, end: Position): Range { return { start, end }; }

// Story lexer is intentionally limited to story-scope constructs only.
// It will NOT emit NarrativeDecl, SceneDecl tokens, preserving domain separation.
export interface StoryLexerOptions { preserveWhitespace?: boolean; }

export function lexStory(input: string, options: StoryLexerOptions = {}): Token[] {
	const tokens: Token[] = [];
	let offset = 0; let line = 1; let column = 1;
	function push(type: TokenType, value: string, startOffset: number, startLine: number, startColumn: number) {
		const start = makePos(startOffset, startLine, startColumn);
		const end = makePos(offset, line, column);
		tokens.push({ type, value, range: makeRange(start, end) });
	}
	while (offset < input.length) {
		const ch = input[offset];
		const startOffset = offset; const startLine = line; const startColumn = column;
		// newline handling (supports CRLF)
		if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && input[offset+1] === '\n') offset++;
			offset++; line++; column = 1;
			push('Newline', '\n', startOffset, startLine, startColumn);
			continue;
		}
		// horizontal whitespace
		if (/[\t ]/.test(ch)) {
			while (offset < input.length && /[\t ]/.test(input[offset])) { offset++; column++; }
			if (options.preserveWhitespace) push('Whitespace', input.slice(startOffset, offset), startOffset, startLine, startColumn);
			continue;
		}
		// ::story: declaration (and ONLY story here)
		if (ch === ':' && input.startsWith('::', startOffset)) {
			offset += 2; column += 2;
			let word = '';
			while (offset < input.length && /[a-zA-Z_]/.test(input[offset])) { word += input[offset]; offset++; column++; }
			if (input[offset] === ':') {
				offset++; column++;
				if (word === 'story') push('StoryDecl', 'story', startOffset, startLine, startColumn);
				else {
					// Treat any other ::word: in a story file as Unknown (not narrative/scene)
					push('Unknown', word, startOffset, startLine, startColumn);
				}
				// Optional identifier immediately following
				let id = '';
				const idStartOffset = offset;
				while (offset < input.length && /[a-zA-Z0-9_]/.test(input[offset])) { id += input[offset]; offset++; column++; }
				if (id) {
					const idStart = makePos(idStartOffset, startLine, startColumn + (idStartOffset - startOffset));
					const idEnd = makePos(offset, line, column);
						tokens.push({ type: 'Identifier', value: id, range: { start: idStart, end: idEnd } });
				}
				continue;
			} else {
				push('Unknown', '::' + word, startOffset, startLine, startColumn);
				continue;
			}
		}
		// Metadata key @key:
		if (ch === '@') {
			offset++; column++;
			let key = '';
			while (offset < input.length && /[a-zA-Z0-9_]/.test(input[offset])) { key += input[offset]; offset++; column++; }
			if (input[offset] === ':') { offset++; column++; push('AtKey', key, startOffset, startLine, startColumn); }
			else push('Unknown', '@' + key, startOffset, startLine, startColumn);
			continue;
		}
		if (ch === '-') { offset++; column++; push('Dash', '-', startOffset, startLine, startColumn); continue; }
		if (ch === ':') { offset++; column++; push('Colon', ':', startOffset, startLine, startColumn); continue; }
		// bare identifiers (including files section)
		if (/[a-zA-Z_]/.test(ch)) {
			let ident = '';
			while (offset < input.length && /[a-zA-Z0-9_\.]/.test(input[offset])) { ident += input[offset]; offset++; column++; }
			if (ident.toLowerCase() === 'files') push('FilesSection', ident, startOffset, startLine, startColumn);
			else push('Identifier', ident, startOffset, startLine, startColumn);
			continue;
		}
		// fallback unknown single char
		offset++; column++;
		push('Unknown', ch, startOffset, startLine, startColumn);
	}
	const eofPos = makePos(offset, line, column);
	tokens.push({ type: 'EOF', value: '', range: { start: eofPos, end: eofPos } });
	return tokens;
}

