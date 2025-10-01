// Unicode helper for identifiers (Chinese + general letters).
// We allow any Unicode letter (\p{L}) or underscore as a start.
// Continuations may include letters, numbers (\p{N}), underscore, or dot.
// NOTE: We intentionally do NOT include hyphen to avoid ambiguity with dash tokens.

const START_RE = /[\p{L}_]/u;
const CONT_RE = /[\p{L}\p{N}_\.]/u;

export function isIdentStart(ch: string): boolean {
  return START_RE.test(ch);
}
export function isIdentContinue(ch: string): boolean {
  return CONT_RE.test(ch);
}

// Metadata keys mirror identifier start/continue rules (no dot for keys for now)
const KEY_START_RE = /[\p{L}_]/u;
const KEY_CONT_RE = /[\p{L}\p{N}_]/u;
export function isKeyStart(ch: string): boolean { return KEY_START_RE.test(ch); }
export function isKeyContinue(ch: string): boolean { return KEY_CONT_RE.test(ch); }
