# StoryMode DSL (Initial Minimal Spec)

This document captures the currently accepted minimal syntax decisions.
Further proposals are discarded until explicitly revived.

## Directives
- `::story: <id>` begins a story file. Ends with `::end: {{ <id> }}`.
- `::narrative: <id>` begins a narrative file.
- `::scene: <id>` begins a scene inside a narrative file.
- `::end: {{ <id> }}` terminates a story file (id must match start). A scene may also end with `::end: {{ <scene_id> }}`.

No other directive forms are currently accepted. Extra colons (`:::`) are invalid.

## Indentation
- Two‑space indentation per level.
- Story metadata and list headers: 2 spaces.
- List items: 4 spaces (i.e. +2 from header).
- Narrative metadata (if any): 2 spaces.
- Scene directives typically indented relative to narrative (e.g. 4 spaces in examples) but parser accepts any multiple-of-two consistent pattern.

## Story File Shape (Canonical)
```
::story: echoes_of_starlight
  @title: Echoes of Starlight
  @start: intro
  files:
    - intro.narrative
    - main.narrative
    - outro.narrative
::end: {{ echoes_of_starlight }}
```
(Additional metadata keys allowed using `@key: value`.)

## Narrative Shape (Illustrative)
```
::narrative: act1
  @title: Act I - Fractures

    ::scene: arrival
      @title: Arrival at the Archive
    ::end: {{ arrival }}

    ::scene: corridor_glitch
      @title: Corridor Glitch
    ::end: {{ corridor_glitch }}

    ::scene: corridor_glitch_alt_a
      @variant_of: corridor_glitch
      @title: Corridor Glitch (Phase Inversion)
    ::end: {{ corridor_glitch_alt_a }}
::end: {{ act1 }}
```

## Metadata Lines
- Form: `@key: value`.
- Keys are simple identifiers; values are raw remainder (trimmed).
- Repeated keys: last value wins (no merging) for now.
- Synonym keys (singular/plural) accepted and normalized:
  - `@author:` or `@authors:` → canonical logical field `authors` (array). A single name becomes a one‑element array.
  - `@copyright_holder:` or `@copyright_holders:` → canonical logical field `copyright_holders` (array).
- Normalization rules:
  1. If only singular form appears → stored as array with one item.
  2. If both singular and plural forms appear → values are concatenated (order of appearance) with de‑duplication; diagnostic (info) issued: `PluralOverride`.
  3. Comma‑separated lists split on `,` with trimming.
- Other keys currently have no singular/plural mapping (future additions explicit).

### Variant Scenes
- A scene that is an alternate version of another scene declares: `@variant_of: <base_scene_id>`.
- This marks it as an optional alternative; base flow remains linear regardless of variants.
- Unknown base scene id → warning (not an error) because author may add base later.
- Multiple variants referencing same base are allowed.
- Unlimited variants: any number of scenes may declare `@variant_of: <base_scene_id>`; they are collected in order of appearance into an ordered variant array for that base scene. This order is preserved for printing and tooling (e.g. variant[0], variant[1], ...). Tooling must not impose a maximum or reorder variants implicitly.
- Printing rule: When generating a final script, each variant scene is emitted immediately after its base scene (primary) in linear order before proceeding to the next non‑variant scene. Variants are visually distinguished (e.g. header suffix or annotation) but do not alter canonical flow numbering.

## Lists
- List header like `files:` at indent level 1 (2 spaces) introduces a list.
- Each list item: `- value` at the next indent level (4 spaces).

## Anchors / References
- `{{ id }}` used in end directives (scene, narrative, story).
- Spaces inside braces normalized.

## Character & Dialogue (Deferred)
- Character marker syntax and dialogue rules are deferred; anything starting with `[[` currently unsupported (diagnostic) until finalized.

## Cues / Actions (Deferred)
- Lines starting with `!`, `^^`, or other prospective cue markers are unsupported (diagnostic) until cue system finalized.

## Comments & Notes (Deferred)
- Lines beginning with `#`, `//`, `###`, or similar are treated as unknown and produce diagnostics.

## Validation Rules (Initial)
- Missing starting directive → error.
- Multiple story directives in one story file → error.
- Missing end directive in story file → error.
- End directive id mismatch → error.
- Unknown directive (not in the list above) → error.
- Bad indentation (tabs or non-multiple-of-2 leading spaces where structure expected) → warning.
- Unknown structural line (unrecognized leading sigil) → warning.
- Variant base missing → warning.

## Formatting Principles
- Enforce two‑space indentation (normalization step may realign scenes).
- Remove trailing whitespace.
- Ensure final newline.

## Out of Scope (Explicitly Deferred)
- Dialogue blocks `[[ Name ]]`.
- Speech lines `"..."`.
- Action/cue prefixes (^^, !action:, etc.).
- Multi-line notes or comments.
- Jump/alternate target lists after scene end lines (future feature; not specified yet).
- Plugin / extension directives.

## Rationale
Keep the DSL minimal until core parsing, validation, and formatting for stories, narratives, scenes, and variants are stable. Additional constructs will be layered gradually.

---
End of minimal spec.

## Cue Lines (Introduced)
Cue lines are now part of the minimal spec inside scene bodies (after a scene directive and before `::end:`). They are optional and may appear in any order before dialogue features (still deferred) or other future constructs.

Syntax (single line each, 2-space indentation relative to scene body level):
- `!sfx: <id_or_list>` one or more short, discrete sound effect identifiers.
- `!music: <track_id>` a background music track (one per line; multiple lines can indicate sequential changes).
- `!vfx: <id_or_list>` one or more visual effect identifiers.

Values:
- Single token or bracketed list: `[id1, id2, id3]` (commas optional after last; internal spaces trimmed).
- Comma-separated form without brackets MAY be accepted in future; canonical output uses bracketed form when >1 item.
- Identifier charset: `[a-zA-Z0-9_\-]` (no spaces). Unknown characters → warning.

Semantics:
- `!sfx` items are momentary triggers (printed inline under scene with label `SFX:`).
- `!music` sets or changes the currently active music layer (printed as `MUSIC:`). Replacing earlier music does not require an explicit stop token.
- `!vfx` items denote simultaneous visual effect cues (printed as `VFX:`).
- Multiple cues of different types MAY be adjacent; ordering preserved.

Printing Rules:
1. Each cue line prints on its own output line in the final script, prefixed by its uppercase label (SFX / MUSIC / VFX) followed by a colon and a space-separated canonical list of items.
2. Single-item lists print without brackets; multi-item lists print with brackets in-angle or bracket style? Canonical: retain brackets `[a, b]` for >1 items.
3. Consecutive cues of the same type are NOT merged automatically (author’s order retained).

Data Model (proposed):
```ts
interface CueBase { type: 'sfx' | 'music' | 'vfx'; line: number; column: number; raw: string; }
interface MultiItemCue extends CueBase { items: string[]; }
// music is effectively a single-item cue but modelled uniformly
export type Cue = MultiItemCue;
```
Scenes acquire:
```ts
interface Scene {
  id: string;
  variantOf?: string; // from @variant_of
  cues: Cue[]; // in encountered order
  // ... existing / future fields
}
```

Validation:
- Duplicate item inside one cue list → warning (DuplicateCueItem).
- Empty bracket list `[]` → warning (EmptyCueList).
- Unknown cue type (any `!<key>:` not sfx|music|vfx) → warning (UnknownCueType) (reserved for plugins later).
- Ill-formed list (missing closing bracket) → error (MalformedCueList).

Diagnostics Codes (added):
- SM450 UnknownCueType
- SM451 MalformedCueList
- SM452 EmptyCueList
- SM453 DuplicateCueItem
- SM454 InvalidCueIdentifier

Formatter:
- Normalize indentation to 2 spaces beyond scene directive indentation.
- Sort items inside a list? NO — preserve author order.
- Remove duplicate trailing commas inside lists.
- Insert a space after commas.

Deferred Still:
- Character / dialogue blocks `[[ Name ]]`.
- Action lines (e.g., `!action:`) — may be added similarly later.
