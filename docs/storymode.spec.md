# StoryMode DSL Specification (Implemented Feature Set – v0.0.1)

This document reflects the **currently implemented** syntax and behavior in the codebase (desktop editor + core parsers) as of release `v0.0.1`.
Sections once marked *deferred* have been reconciled; anything still deferred is explicitly listed at the end.

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

## Character & Dialogue (Implemented)
Character dialogue blocks and dialogue lines are supported.

### Syntax
Character header line:
```
[[ CHARACTER NAME ]]
```
- Double brackets, inner content up to 60 chars, trimmed; any trailing/leading spaces inside brackets removed.
- Name kept as authored (case preserved) but tooling may display uppercase.

Dialogue lines:
```
"This is a line of dialogue." 
"Another line continuing the speech."
```
Each dialogue line must immediately follow its character header or a previous dialogue line for the same character. A blank line, cue, metadata line, new character, or directive terminates the current character dialogue block.

### Data Model Additions
Scene gains:
```
dialogue: Array<{
  character: string;
  line: number; // starting line of character block
  lines: { text: string; line: number; column: number }[];
}>
```

### Validation
- Dialogue line without an active character block → warning `SM_DIALOGUE_NO_CHARACTER`.
- Empty character block (no dialogue lines) is silently ignored (not emitted) (future: warning).

### Printing / Preview Rules
1. Character name rendered (currently bold + indented in preview). Uppercasing may be applied visually.
2. Dialogue lines appear further indented below the character name (preview uses separate style classes rather than literal spaces in source lines).
3. Multiple dialogue blocks for the same character are allowed; they remain separate.
4. Any cue, action line, blank line, new character, or directive terminates the active block.

### Future (Deferred Advanced Dialogue)
- Parentheticals (e.g., `(whispering)`)
- Multi-paragraph dialogue wrapping rules
- Dual dialogue columns
- Character aliases / normalization
- Automatic character list extraction for credits.

## Action Lines (Implemented)
Single-line action / description lines use the syntax:
```
!action: Description of environment or stage direction.
```
They are stored as:
```ts
interface ActionLine { text: string; line: number; column: number; }
scene.actions: ActionLine[]
```
Rules:
1. Must start with `!action:` (case-sensitive) followed by text (trimmed once; internal spacing preserved).
2. Appears intermixed with cues and dialogue.
3. Printed in preview as italic (current styling).
4. Empty body after `!action:` → warning (future: implement diagnostic code `SM_ACTION_EMPTY`).

## Cue Lines (Implemented)
Cue lines are part of the minimal spec inside scene bodies.

Syntax (one per line):
```
!sfx: boom             # one or more short SFX identifiers
!music: deep_underscore
!vfx: sparks, smoke    # comma or bracket list allowed (parser normalizes)
```

Current parser implementation (v0.0.1):
```
!sfx: item1, item2, item3
!music: track_id
!vfx: effect_a, effect_b
```
Accepted list forms: comma‑separated tokens; brackets are tolerated if already authored but output stored as items array.

Data model:
```ts
interface Cue { type: 'sfx' | 'music' | 'vfx'; items: string[]; line: number; column: number; }
scene.cues: Cue[] // order preserved
```

Validation (implemented / partial):
- Unknown cue type → warning (`SM450` planned; may currently appear as generic unknown line if unrecognized).
- Empty item list → warning (planned).
- Duplicate items inside one cue line → warning (planned).

Preview Printing:
- Shown with uppercase label (SFX/MUSIC/VFX) followed by colon and comma-separated list.
- Coloring/styling applied (indigo tone for cues).

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

## Variant Scene Lists on End Directives (Implemented)
Base scene end directive may enumerate variant scenes:
Inline form:
```
::end: {{ corridor_glitch }} -> [ {{ corridor_glitch_alt_a }}, {{ corridor_glitch_alt_b }} ]
```
Multiline form:
```
::end: {{ corridor_glitch }} -> [
  {{ corridor_glitch_alt_a }}
  {{ corridor_glitch_alt_b }}
]
```
Parser collects variant ids into `scene.variants`. Unknown variant ids (no matching subsequent variant scene) may generate future warnings (pending rule).

## Deferred (Not Yet Implemented)
- Parentheticals in dialogue `(whispering)`.
- Dual / simultaneous dialogue columns.
- Character alias normalization / canonicalization list.
- Automatic extraction of character list for credits page.
- Advanced cue validation diagnostics (duplicate item, empty list).
- Notes / comment syntax (`#`, `//`) with structured suppression (currently emit generic unknown warnings).
- Jump/alternate branching directives post-scene.
- Plugin / extension directive namespace.

## Rationale
Keep the DSL minimal until core parsing, validation, and formatting for stories, narratives, scenes, and variants are stable. Additional constructs will be layered gradually.

---
<!-- Previous exploratory cue proposal section removed; consolidated into implemented Cue Lines section above. -->
- Character / dialogue blocks `[[ Name ]]`.
- Action lines (e.g., `!action:`) — may be added similarly later.
