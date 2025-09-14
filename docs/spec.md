# StoryMode DSL Language Specification (Draft v0.2)

This document defines the authoritative syntax + ordering rules for StoryMode files.
It extends `docs/grammar.md` (current minimal core) with the full construct universe
and enshrines ordering constraints that MUST be enforced by the compiler.

Status legend:
- CORE: Already implemented in lexer/parser.
- PLANNED: Specified, not yet implemented.
- FUTURE: Possible extension; not required now.

## 1. File Types
| Type | Extension | Declaration | Purpose |
|------|-----------|-------------|---------|
| Story File | `.story` | `::story:<id>` | Root story metadata + narrative file list | 
| Narrative File | `.narrative` | `::narrative:<id>` | Contains ordered scene blocks |

## 2. Declarations & Blocks
| Keyword | Form | Scope | Status | Notes |
|---------|------|-------|--------|-------|
| story | `::story:<id>` | file (story) | CORE | Must be first non-whitespace token |
| narrative | `::narrative:<id>` | file (narrative) | CORE | Must be first non-whitespace token |
| scene | `::scene:<id>` | narrative | CORE | Introduces a scene; id required |
| meta | `meta` (TBD) | scene | PLANNED | Structured metadata block alternative to loose @lines |
| character | `character <Name>` | scene | PLANNED | Alternative to symbolic form `🞶` |
| flag | `flag <id>` | story/narrative | FUTURE | Declare state flag |
| set | `set <flag> = <value>` | runtime | FUTURE | Assign/update flag |
| goto | `goto <sceneId>` | narrative | PLANNED | Jump to scene (keyword form of ⇝) |
| note | `note <text>` | any | PLANNED | Exportable authoring note (keyword form of ✎) |
| tag | `tag <id>` | any block | FUTURE | Add label to entity |

## 3. Symbolic Constructs (Unicode Layer)
Symbol tokens are syntactic sugar / visual markers. They map to semantic node kinds.

| Symbol | Meaning | Unicode | Scope | Node Kind (planned) | Notes |
|--------|---------|---------|-------|---------------------|-------|
| `§` | Scene Anchor | U+00A7 | narrative | SceneDecl (alias) | Optional alternative to `::scene:` |
| `※` | Directive/Metadata Block Start | U+203B | scene | MetaBlock | Contains only `＠` lines |
| `＠` | Metadata Attribute | U+FF20 | meta/scene | MetaEntry | Visual alt to `@key:` | 
| `🞶` | Character Declaration | U+1F7B6 | scene | CharacterBlock | Starts character dialogue section |
| `↠` | Dialogue (spoken) | U+291E | character | DialogueLine | Quoted or raw text |
| `∵` | Thought / Monologue | U+2235 | character / narrative paragraph | ThoughtLine | |
| `↪` | Dialogue Continuation | U+21AA | character | DialogueLine (continuation) | Same speaker |
| `⦿` | Sound Effect (SFX) | U+29BF | global/character | MediaCue(kind="sfx") | Placement rules below |
| `⬟` | Visual Effect (VFX) | U+2B1F | global/character | MediaCue(kind="vfx") | |
| `♬` | Music Cue | U+266C | global/character | MediaCue(kind="music") | Start/stop/change |
| `⧈` | Camera Cue | U+29C8 | global/character | MediaCue(kind="cam") | |
| `⚑` | Narrative Flag | U+2691 | narrative | FlagRef | Read/update TBD |
| `⇝` | Scene Redirection / Goto | U+21DD | scene | Goto | Equivalent to `goto <id>` |
| `✦` | Lore Anchor / Reference | U+2726 | narrative | LoreRef | Informational |
| `✎` | Note | U+270E | any | Note | Exportable authoring note |
| `¶` | Narrative Paragraph Start | U+00B6 | scene | ParagraphBlock | Contains narrative lines |
| `#` | Comment (single) | U+0023 | any | (ignored) | Also permit after tokens |
| `//` | Comment (alt) | U+002F | any | (ignored) | Recognize whole line |
| `/**` `**/` | Block Comment | - | any | (ignored) | Multiline skip |
| `///` | Inline Note | - | any | Note(kind=inline) | Non-export by default |
| `###` | Exported Note Block | - | any | Note(kind=block) | Multi-line until blank |

## 4. Narrative File Ordering Rules (Normative)
Ordering is STRICT. The parser must reject (diagnostic severity=error) violations.

At top level inside a narrative file:
1. Exactly one Narrative Declaration first.
2. Zero or more blank lines / comments.
3. One or more Scene Blocks (no other top-level constructs yet).

Scene Block canonical structure (sections may be optional where marked):
```
::scene:<id>
@meta lines (zero or more)            (Phase 1: Scene Metadata Region)
GLOBAL MEDIA CUES (optional group)    (Phase 2: Global Media Region)
CHARACTER BLOCKS (one or more)        (Phase 3: Character Region)
PARAGRAPH BLOCKS (optional)           (Phase 4: Paragraph Region)
REDIRECTIONS (optional)               (Phase 5: Flow Control Region)
NOTES / FOOTNOTES (optional)          (Phase 6: Authoring Notes Region)
```
Each phase is a contiguous region. Once you leave a phase you cannot return to an earlier phase.

### 4.1 Phase Details
- Phase 1 (Metadata): Only `@key:` or `※` MetaBlock accepted. Encountering a character decl, media cue, paragraph, or goto ends Phase 1.
- Phase 2 (Global Media): Lines beginning with one of: `⦿`, `⬟`, `♬`, `⧈`. These cues apply to the entire scene baseline. Character-specific cues are NOT in this phase.
- Phase 3 (Characters): Consists of repeated Character Blocks.
  Character Block grammar:
  ```
  🞶 <Name>
    (inline character metadata via ＠ lines OPTIONAL)
    (zero or more inline media cues restricted to: ⦿ ⬟ ♬ ⧈)  // character-local media BEFORE first dialogue/ thought line
    (one or more dialogue/ thought lines: ↠, ↪, ∵)
    (interleaved media cues may appear BETWEEN dialogue lines only IF flagged ALLOW_INLINE_MEDIA_LATE in future; default now: NOT allowed after first dialogue line in v0.2)
  ```
- Phase 4 (Paragraphs): One or more `¶ <id?>` starting narrative paragraphs containing free-form narrative lines (dialogue cues not allowed inside unless spec extends later). Thoughts `∵` allowed inside paragraphs.
- Phase 5 (Redirections): Lines starting with `⇝ <sceneId>` appear after all content.
- Phase 6 (Notes): Lines starting with `✎` (or block notes `###`) appear last.

### 4.2 Media Cue Placement
- Global cues: Only allowed in Phase 2.
- Character-local cues: Only allowed in Phase 3 inside a character block BEFORE the first dialogue/thought line of that character.
- Diagnostic Codes (planned):
  - `OUT_OF_ORDER_PHASE` – token belongs to an earlier phase after transition.
  - `MEDIA_CUE_AFTER_DIALOGUE` – character media cue appears after dialogue.
  - `GLOBAL_MEDIA_IN_CHARACTER` – global media placed inside character block (if encountered after dialogue start).

### 4.3 Metadata Restrictions
- Narrative-level metadata (directly under `::narrative:`) is FORBIDDEN (diagnostic `NARRATIVE_METADATA_FORBIDDEN`).
- Scene metadata only in Phase 1. `※` block is syntactic sugar for grouped metadata lines each beginning with `＠`.

## 5. AST Additions (Planned)
```ts
interface NarrativeFile { id: string; scenes: Scene[]; }
interface Scene {
  id: string;
  metadata: Record<string,string|string[]>;
  globalMedia: MediaCue[]; // Phase 2
  characters: CharacterBlock[]; // Phase 3
  paragraphs: ParagraphBlock[]; // Phase 4
  gotos: Goto[];               // Phase 5
  notes: NoteNode[];           // Phase 6
}
interface MediaCue { kind: 'MediaCue'; mediaType: 'sfx'|'vfx'|'music'|'cam'; id: string; range: Range; scope: 'global'|'character'; }
interface CharacterBlock { kind: 'CharacterBlock'; name: string; metadata: Record<string,string|string[]>; media: MediaCue[]; lines: CharacterLine[]; }
interface CharacterLine { kind: 'DialogueLine'|'ThoughtLine'; text: string; continuation?: boolean; }
interface ParagraphBlock { kind: 'ParagraphBlock'; id?: string; lines: string[]; }
interface Goto { kind: 'Goto'; target: string; }
interface NoteNode { kind: 'Note'; noteType: 'inline'|'block'|'line'; text: string; exportable: boolean; }
```

## 6. Error Handling / Diagnostics (Planned Codes)
| Code | Meaning |
|------|---------|
| MISSING_NARRATIVE_DECL | Already exists |
| MISSING_NARRATIVE_ID | Already exists |
| MISSING_SCENE_ID | Already exists |
| NARRATIVE_METADATA_FORBIDDEN | Metadata found before first scene |
| OUT_OF_ORDER_PHASE | Token appears in invalid phase order |
| MEDIA_CUE_AFTER_DIALOGUE | Character media cue too late |
| GLOBAL_MEDIA_IN_CHARACTER | Global-only cue placed after entering character dialogue |
| UNKNOWN_SYMBOL | Unicode symbol not recognized |

## 7. Implementation Strategy
1. Extend tokenization to emit distinct token types for each symbol (short-term treat as `Symbol` + value property).
2. Incrementally implement Phase machine inside `parseNarrative`.
3. Add character block parsing with lookahead for dialogue vs media cues.
4. Introduce new AST interfaces behind feature flag until stable.
5. Add exhaustive tests for each ordering violation.

## 8. Examples
(See user-provided canonical ordering example in conversation; replicate here once implemented.)

---
Draft complete – subject to refinement during implementation.
