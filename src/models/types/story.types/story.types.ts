import type { Diagnostic } from '../common.types/common.types';

export interface Story {
  id: string;
  title?: string;
  files: string[];
  metadata: Record<string, any>;
  diagnostics: Diagnostic[];
}
