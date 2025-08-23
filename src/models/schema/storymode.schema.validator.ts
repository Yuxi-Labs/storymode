import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from './storymode.schema.json' assert { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema as any);

export interface ValidationIssue {
  message?: string;
  instancePath: string;
  schemaPath: string;
}

export function validateStoryObject(obj: any): ValidationIssue[] {
  // rely on oneOf branch selection; ensure required story keys present to steer selection
  validate(obj);
  if (!validate.errors) return [];
  return (validate.errors as any[]).map(e => ({ message: e.message, instancePath: e.instancePath, schemaPath: e.schemaPath }));
}

export const validateNarrativeObject = validateStoryObject; // unified schema; selection by shape
