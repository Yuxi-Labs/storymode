import { StoryFile, Diagnostic, DiagnosticCodes } from '../types/ast.js';

export interface StorySemanticsOptions {
  /** Resolve a file path to boolean existence. If omitted, existence checks are skipped. */
  fileExists?: (path: string) => boolean;
}

export function validateStorySemantics(story: StoryFile, diagnostics: Diagnostic[], opts: StorySemanticsOptions = {}): void {
  const seenFiles = new Set<string>();
  for (const f of story.files) {
    if (seenFiles.has(f)) {
      diagnostics.push({ message: `Duplicate file entry '${f}'`, severity: 'warning', range: story.range, code: DiagnosticCodes.DUP_FILE_ENTRY });
    } else {
      seenFiles.add(f);
      if (opts.fileExists && !opts.fileExists(f)) {
        diagnostics.push({ message: `Unresolved file '${f}'`, severity: 'error', range: story.range, code: DiagnosticCodes.UNRESOLVED_FILE });
      }
    }
  }
  if (story.start) {
    if (!story.files.includes(story.start)) {
      diagnostics.push({ message: `Start target '${story.start}' not found in files list`, severity: 'error', range: story.range, code: DiagnosticCodes.MISSING_START_TARGET });
    }
  }
}
