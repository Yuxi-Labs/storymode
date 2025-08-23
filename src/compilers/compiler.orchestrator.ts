import { compileStory, CompiledStory } from './story.compiler';
import { compileNarrative, CompiledNarrative } from './narrative.compiler';

export type CompileResult = CompiledStory | CompiledNarrative;

export function detectKind(source: string): 'story' | 'narrative' | 'unknown' {
	const lines = source.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
	if (!lines.length) return 'unknown';
	const first = lines[0];
	if (first.startsWith('::story:')) return 'story';
	if (first.startsWith('::narrative:')) return 'narrative';
	return 'unknown';
}

export interface OrchestratorOptions { fileName?: string }

export function compile(source: string, opts: OrchestratorOptions = {}): CompileResult {
	const kind = detectKind(source);
	const file = opts.fileName || (kind === 'story' ? 'inline.story' : kind === 'narrative' ? 'inline.narrative' : 'inline.txt');
	if (kind === 'story') return compileStory(source, file);
	if (kind === 'narrative') return compileNarrative(source, file);
	throw new Error('Unknown content kind: cannot compile');
}

