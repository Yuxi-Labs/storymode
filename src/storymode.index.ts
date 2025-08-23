// Entry point for StoryMode TypeScript ESM build.

export const version = '0.1.0';

export * from './models/storymode.types.js';
export { parseStoryFile } from './parsers/story.parser/story.parser.js';
export { parseNarrativeFile } from './parsers/narrative.parser/narrative.parser.js';
