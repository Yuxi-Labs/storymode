import { parseNarrativeFile } from '../parsers/narrative.parser/narrative.parser';
import type { Narrative } from '../models/types/narrative.types/narrative.types';

export interface CompiledNarrativeScene {
	id: string;
	title?: string;
	cues: { type: string; items: string[] }[];
}

export interface CompiledNarrative {
	kind: 'narrative';
	id: string;
	title?: string;
	scenes: CompiledNarrativeScene[];
	metadata: Record<string, any>;
	diagnostics: Narrative['diagnostics'];
	sourceFile: string;
}

export function compileNarrative(source: string, file = 'inline.narrative'): CompiledNarrative {
	const parsed = parseNarrativeFile(source, file);
	return {
		kind: 'narrative',
		id: parsed.id,
		title: parsed.title,
		scenes: parsed.scenes.map(s => ({ id: s.id, title: s.title, cues: s.cues.map(c => ({ type: c.type, items: c.items })) })),
		metadata: parsed.metadata,
		diagnostics: parsed.diagnostics,
		sourceFile: file
	};
}

