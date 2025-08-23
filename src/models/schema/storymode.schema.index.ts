// Export the unified StoryMode JSON Schema and runtime validators
import schema from './storymode.schema.json' assert { type: 'json' };
export const storymodeSchema = schema;
export { validateStoryObject, validateNarrativeObject } from './storymode.schema.validator';
