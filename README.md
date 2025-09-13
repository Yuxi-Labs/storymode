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
```bash
npm install @yuxi-labs/storymode-core
```

From Git before publish or for a pinned tag/commit (repository path unchanged):
```bash
npm install Yuxi-Labs/storymode-core#v0.2.0
# or a specific commit
npm install Yuxi-Labs/storymode-core#<commit-sha>
```

## Quick Usage
```ts
import { parseStory, parseNarrative } from '@yuxi-labs/storymode-core';

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
} from '@yuxi-labs/storymode-core';
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
`STORYMODE_CORE_VERSION` exported (current: `0.2.0`). While in `0.x`:
- Minor bumps (0.x → 0.(x+1).0) may introduce breaking grammar / diagnostic changes.
- Patch bumps should remain safe.
- Two stable consecutive minors without grammar / diagnostic mutation will trigger a 1.0 review.

Pin exact versions in downstream tools: `"@yuxi-labs/storymode-core": "0.2.0"`.

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
