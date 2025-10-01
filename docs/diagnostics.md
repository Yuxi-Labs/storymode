# Diagnostics Reference

All diagnostics produced by the core parsers were originally syntactic / structural only. As of 0.3.x a small set of opt-in semantic validations (scene/file uniqueness & resolution) are introduced.

## Codes
| Code | Severity | Emitted When | Notes |
|------|----------|--------------|-------|
| `MISSING_STORY_DECL` | error | First token in a story file is not `::story:` | File still parsed; id may be empty |
| `MISSING_STORY_ID` | error | Story declaration lacks identifier | `id` set to '' |
| `MISSING_NARRATIVE_DECL` | error | First token in a narrative file is not `::narrative:` | File still parsed; id may be empty |
| `MISSING_NARRATIVE_ID` | error | Narrative declaration lacks identifier | `id` set to '' |
| `MISSING_SCENE_ID` | error | `::scene:` without following identifier | Scene created with empty id |
| `DUP_KEY` | warning | Metadata key repeats within same story file | Last value wins |
| `EXPECTED_<TOKEN>` | error | Parser expectation helper sees wrong token type | `<TOKEN>` is dynamic (e.g., `EXPECTED_Identifier`) |
| `NARRATIVE_METADATA_FORBIDDEN` | error | Metadata appears before first scene in narrative | Narrative top-level forbids @metadata |
| `OUT_OF_ORDER_PHASE` | error | Construct appears after later content phase began | Phase ordering: metadata→media→character/dialogue→paragraph→goto→note |
| `MEDIA_CUE_AFTER_DIALOGUE` | error | Character-scoped media emitted after dialogue in same block | Must precede dialogue lines |
| `UNKNOWN_SYMBOL` | warning | Unicode symbol token not recognized in ordering rules | Future symbol or typo |
| `DUP_SCENE_ID` | error | Two scenes share the same id within one narrative | Second and onward flagged |
| `UNRESOLVED_FILE` | error | Entry in story `files` does not resolve via provided resolver | Resolver supplied by host |
| `MISSING_START_TARGET` | error | Story `@start:` references id not present in `files` list | Emitted only if `@start` present |
| `DUP_FILE_ENTRY` | warning | Duplicate path in story `files` list | Later entries ignored by tooling |

## Structure
Each diagnostic:
```ts
interface Diagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info';
  range: { start: Position; end: Position };
  code?: string; // one of codes above or dynamic EXPECTED_*
}
```

## Ranges
Ranges always span the exact lexed token region (or zero-length at EOF). The lexer normalizes CRLF to a single `Newline` token.

## Design Principles
- Non-blocking: parsing continues after errors to collect more diagnostics.
- Deterministic: same input => same ordering of diagnostics.
- Minimal: only codes in active use are enumerated; others added as features grow.

## Future Additions (Out of Core Scope)
- Cross-file reference validation (e.g., story `files` entries must resolve)
- Start narrative existence check
- Scene uniqueness / ordering constraints
- Unused resource detection
