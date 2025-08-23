import { parseStoryFile } from '../parsers/story.parser/story.parser';
import type { Story } from '../models/types/story.types/story.types';

export interface CompiledStory {
	kind: 'story';
	id: string;
	title?: string;
	files: string[];
	authors?: string[]; // convenience extraction if present in metadata
	metadata: Record<string, any>;
	diagnostics: Story['diagnostics'];
	sourceFile: string;
}

export function compileStory(source: string, file = 'inline.story'): CompiledStory {
	const parsed = parseStoryFile(source, file);
	const authors = Array.isArray(parsed.metadata.authors) ? parsed.metadata.authors : undefined;
	return {
		kind: 'story',
		id: parsed.id,
		title: parsed.title,
		files: parsed.files,
		authors,
		metadata: parsed.metadata,
		diagnostics: parsed.diagnostics,
		sourceFile: file
	};
}

