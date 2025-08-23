// Entry point for StoryMode TypeScript ESM build.

export const version = '0.1.0';

export * from './models/storymode.types';
export { parseStoryFile } from './parsers/story.parser/story.parser';
export { parseNarrativeFile } from './parsers/narrative.parser/narrative.parser';
export { compileStory } from './compilers/story.compiler';
export { compileNarrative } from './compilers/narrative.compiler';
export { compile, detectKind } from './compilers/compiler.orchestrator';
export { storymodeSchema, validateStoryObject, validateNarrativeObject } from './models/schema/storymode.schema.index';
// Side-effect import ensures desktop-editor main can reference SDK when built
