# StoryMode Core

Core SDK for StoryMode.

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
} from 'storymode-core';
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

### Versioning
`STORYMODE_CORE_VERSION` exported. Current: `0.2.0` — separation finalized; compiler & validation removed.

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
