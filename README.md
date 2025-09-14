# StoryMode Core
Core SDK for the StoryMode DSL (lexing, parsing, AST + diagnostics) with strict scene ordering rules.
# StoryMode Core

<p>
  <!-- Latest Release -->
  <img src="https://img.shields.io/github/v/release/Yuxi-Labs/storymode-core?include_prereleases&sort=semver" alt="Latest Release" />

  <!-- Open Issues -->
  <img src="https://img.shields.io/github/issues/Yuxi-Labs/storymode-core" alt="Open Issues" />

  <!-- Pull Requests -->
  <img src="https://img.shields.io/github/issues-pr/Yuxi-Labs/storymode-core" alt="Pull Requests" />

  <!-- Last Commit -->
  <img src="https://img.shields.io/github/last-commit/Yuxi-Labs/storymode-core" alt="Last Commit" />

  <!-- Contributors -->
  <img src="https://img.shields.io/github/contributors/Yuxi-Labs/storymode-core" alt="Contributors" />

  <!-- License -->
  <img src="https://img.shields.io/badge/License-MIT-orange.svg" alt="License: MIT" />
</p>

Core SDK for StoryMode.

> **Status: Experimental (0.x)**  
> Grammar, AST node shapes, and diagnostic codes can still change between minor versions. Treat any 0.x minor bump as potentially breaking.

## Install

After publish (scoped package):
After publish (scoped package):
```bash
npm install @yuxilabs/storymode-core
npm install @yuxilabs/storymode-core
```

From Git before publish or for a pinned tag/commit (repository path unchanged):
```bash
npm install Yuxi-Labs/storymode-core#v0.2.1
# or a specific commit
npm install Yuxi-Labs/storymode-core#<commit-sha>
```

## Quick Usage
## Quick Usage
```ts
const story = `::story: my_story\n@title: My Story\nfiles:\n- intro.narrative`;
const narrative = `::narrative: intro\n\n::scene: opening\n@title: Opening Scene`;
## DSL Snapshot (Symbols & Keywords)
| Type | Examples |
|------|----------|
| Declarations | `::story: id`, `::narrative: id`, `::scene: id` |
| Metadata | `@title: Text`, `@location: Place` |
| Unicode (media / flow) | `⦿` (sfx), `⬟` (vfx), `♬` (music), `⧈` (camera), `⇝` (goto), `✎` (note) |
| Character / Dialogue | `🞶 Name`, `↠` dialogue, `↪` continuation, `∵` thought |
| Structural | `¶` paragraph start |

> Parser currently enforces ordering + metadata constraints and produces diagnostics for violations; semantic node population for characters/media is staged for later versions.

## Scene Ordering (Strict Phases)
Inside each `::scene:` the parser applies a one‑way progression:
1. Metadata (`@key:` lines)
2. Global Media Cues (`⦿ ⬟ ♬ ⧈` before any characters)
3. Character Blocks (`🞶` + pre‑dialogue media then `↠`/`∵` lines)
4. Paragraph Blocks (`¶` ... narrative prose)
5. Redirections (`⇝ target_scene`)
6. Notes (`✎ ...`)

Violations (e.g., media after dialogue, metadata late, global media after characters) emit diagnostics; parse still returns partial AST.

## Diagnostics (Core + Ordering)
| Code | Meaning |
|------|---------|
| `MISSING_STORY_DECL` | Story file missing leading declaration |
| `MISSING_STORY_ID` | Story id absent |
| `MISSING_NARRATIVE_DECL` | Narrative file missing declaration |
| `MISSING_NARRATIVE_ID` | Narrative id absent |
| `MISSING_SCENE_ID` | Scene id absent |
| `DUP_KEY` | Duplicate metadata key in same scope |
| `NARRATIVE_METADATA_FORBIDDEN` | Metadata found before first scene |
| `OUT_OF_ORDER_PHASE` | Construct appears after a later phase began |
| `MEDIA_CUE_AFTER_DIALOGUE` | Character media placed after dialogue started |
| `UNKNOWN_SYMBOL` | Symbol recognized lexically but not mapped semantically |

## Publishing (Maintainers)
The package is scoped; first publish must specify public access:
```bash
# Bump version first (example patch bump)
npm version patch
# Publish (runs build + tests via prepublishOnly)
npm publish --access public
```
Dry run:
```bash
npm publish --dry-run
```
Optional provenance (if your npm account supports it):
```bash
npm publish --access public --provenance
```
## Scope (What This Package Does)
## API Surface
### Notes on Diagnostics
Unexpected token order inside the parsers may also produce dynamic `EXPECTED_<TOKEN>` style messages (non-enumerated). Ordering / media errors rely on the fixed codes listed above.
`STORYMODE_CORE_VERSION` exported (current version matches package). While in `0.x`:
Pin exact versions in downstream tools: "@yuxilabs/storymode-core": "0.2.x" (avoid caret if you need grammar stability).
## Future (Planned Packages)
## Principles
import { parseStory, parseNarrative } from '@yuxilabs/storymode-core';

const story = `story MyStory`;
const storyResult = parseStory(story);
console.log(storyResult.ast, storyResult.diagnostics);

const narrative = `narrative MyNarrative\nscene Intro`;
const narrativeResult = parseNarrative(narrative);
console.log(narrativeResult.ast, narrativeResult.diagnostics);
```

## Scope (What This Package Does)
- Independent lexers: `lexStory`, `lexNarrative`
- Independent parsers: `parseStory`, `parseNarrative`
- AST node + token + position types (`types/ast.ts`, `types/diagnostics.ts`)
- Central diagnostic codes via `DiagnosticCodes`

## Explicit Non‑Goals (Left Out of Core)
- Project / graph or narrative aggregation compilation
- Code generation or runtime packaging
- CLI commands
- Semantic / cross-file validation beyond syntactic diagnostics

## API Surface
```ts
import {
	lexStory,
	lexNarrative,
	parseStory,
	parseNarrative,
	StoryFile,
	NarrativeFile,
	Scene,
	Token,
	TokenType,
	ParseResult,
	Diagnostic,
	DiagnosticCodes,
	DiagnosticSeverity,
	Position,
	Range,
	STORYMODE_CORE_VERSION
} from '@yuxilabs/storymode-core';
```

### Lexers
| Function | Description |
|----------|-------------|
| `lexStory(source)` | Tokenizes only story constructs; unknown for narrative/scene markers. |
| `lexNarrative(source)` | Tokenizes narrative + scene constructs. |

### Parsers
| Function | Output |
|----------|--------|
| `parseStory(source)` | `ParseResult<StoryFile>` |
| `parseNarrative(source)` | `ParseResult<NarrativeFile>` |

### Diagnostic Codes
Defined in `DiagnosticCodes`:
`MISSING_STORY_DECL`, `MISSING_STORY_ID`, `MISSING_NARRATIVE_DECL`, `MISSING_NARRATIVE_ID`, `MISSING_SCENE_ID`, `DUP_KEY`

Additional expectation errors are emitted as `EXPECTED_<TOKEN>` dynamically.

### Versioning & Stability
`STORYMODE_CORE_VERSION` exported (current: `0.2.1`). While in `0.x`:
- Minor bumps (0.x → 0.(x+1).0) may introduce breaking grammar / diagnostic changes.
- Patch bumps should remain safe.
- Two stable consecutive minors without grammar / diagnostic mutation will trigger a 1.0 review.

Pin exact versions in downstream tools: "@yuxilabs/storymode-core": "0.2.1".

> Renamed: originally published briefly as unscoped `storymode-core`; future releases will use the scoped name for ecosystem consistency.

## Future (Out of Core Packages)
- `storymode-compiler` (AST -> runtime/compiled forms)
- `storymode-lint` (semantic + structural validation)
- `storymode-cli` (developer tooling wrapper)

## Principles
- Stability first: AST + diagnostics = contract
- Separation: Story != Narrative; no unified lexer
- Deterministic output for editor tooling & caching

## License
MIT
