# StoryMode DSL Grammar (Current Minimal Core)

This reflects only what the core lexer + parsers currently recognize. Anything else is ignored or tokenized as `Unknown`.

## File Types
- Story file: must begin with `::story:<id>`
- Narrative file: must begin with `::narrative:<id>`

## Common Lexical Elements
| Element | Form | Notes |
|---------|------|-------|
| Story Declaration | `::story:<id>` | `<id>` now Unicode: `[\p{L}_][\p{L}\p{N}_]*` (Chinese supported); diagnostic if missing |
| Narrative Declaration | `::narrative:<id>` | Narrative files only (same Unicode id rule) |
| Scene Declaration | `::scene:<id>` | Narrative files only; Unicode id required |
| Metadata Key | `@key:` | Key = `[\p{L}_][\p{L}\p{N}_]*` (no dots) followed by `:`; rest of line is value |
| Files Section (story) | `files:` | Introduces a list of narrative filenames |
| List Item (story files) | `- filename.ext` | Collected under files section |
| Newline | `\n` or `\r?\n` | Always tokenized as `Newline` |
| Whitespace | spaces / tabs | Collapsed; only emitted if lexer option `preserveWhitespace` used |
| Identifier | `[\p{L}_][\p{L}\p{N}_\.]*` | Unicode letters & numbers (Chinese) supported |
| EOF | end of input | Synthetic token appended |

## Story File Structure (Parsed Output)
```
::story: <storyId>
@title: <title text>
@start: <narrativeId>
files:
- <narrativeFileName>
- <narrativeFileName>
```
Metadata keys can appear in any order. Duplicate keys produce a `DUP_KEY` diagnostic; last value wins.

### Collected Fields
| Field | Source | Type |
|-------|--------|------|
| `id` | declaration id | string |
| `title` | `@title:` value (optional) | string | 
| `start` | `@start:` value (optional) | string |
| `metadata` | all `@key:` lines (including title/start) | `Record<string,string|string[]>` (currently only string) |
| `files` | list entries after `files:` section | `string[]` |

## Narrative File Structure
```
::narrative: <narrativeId>

::scene: <sceneId>
@title: <scene title>
@location: <location>

::scene: <anotherScene>
@title: Something
```
Scenes may appear sequentially. Metadata lines between scene declarations belong to the preceding scene or are skipped if malformed.

### Parsed Scene Fields
| Field | Source | Type |
|-------|--------|------|
| `id` | scene declaration id | string |
| `metadata` | `@key:` lines under the scene until next scene/EOF | `Record<string,string|string[]>` |

## Unicode Notes
Identifiers and metadata keys accept any Unicode letter (\p{L}) and digits (\p{N}) after the first character, plus `_` and (for general identifiers) `.`. Normalization is not applied; host tools may normalize (recommended NFC) before parsing for consistency.

## Ignored / Not Yet Implemented
- Dialogue / character blocks
- Branching / flags / conditions
- Nested arcs or sequences
- Comments syntax (currently none defined)
- Multiline metadata values

## Token Types Enumerated
`StoryDecl`, `NarrativeDecl`, `SceneDecl`, `Identifier`, `AtKey`, `Colon`, `Dash`, `ListItem` (not currently emitted), `Newline`, `Whitespace` (optional), `EOF`, `FilesSection`, `Unknown`.

`ListItem` appears in type definitions but is not produced by current lexers.

## Evolution Guidelines
- Add new constructs in *both* lexer and parser for that domain only (story vs narrative separation is preserved).
- Introduce new token kinds before adding parser logic to keep diffs small.
- Any semantic (cross-file) rules remain outside this core.
