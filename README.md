# StoryMode Core

Core SDK for the StoryMode DSL: lexing, parsing, AST types, diagnostics, ordering + semantic validation, structural diff utilities, and English and Chinese identifier support.

<p>
  <img src="https://img.shields.io/github/v/release/Yuxi-Labs/storymode-core?include_prereleases&sort=semver" alt="Latest Release" />
  <img src="https://img.shields.io/github/issues/Yuxi-Labs/storymode-core" alt="Open Issues" />
  <img src="https://img.shields.io/github/issues-pr/Yuxi-Labs/storymode-core" alt="Pull Requests" />
  <img src="https://img.shields.io/github/last-commit/Yuxi-Labs/storymode-core" alt="Last Commit" />
  <img src="https://img.shields.io/github/contributors/Yuxi-Labs/storymode-core" alt="Contributors" />
  <img src="https://img.shields.io/badge/License-MIT-orange.svg" alt="License: MIT" />
</p>

> Status: Stable pre-1.0 (`0.x`). Grammar & diagnostic surfaces are tracked; breaking changes are still possible on minor bumps, but core constructs are expected to remain steady.

## Install
```bash
npm install @yuxilabs/storymode-core
```
From Git (tag/commit):
```bash
npm install Yuxi-Labs/storymode-core#v0.3.0
# or a specific commit
npm install Yuxi-Labs/storymode-core#<commit-sha>
```

## Quick Start
```ts
import { parseStory, parseNarrative } from '@yuxilabs/storymode-core';

const storySource = `::story: my_story\n@title: My Story\nfiles:\n- intro.narrative`;
const story = parseStory(storySource);

const narrativeSource = `::narrative: intro\n\n::scene: opening\n@title: Opening Scene`;
const narrative = parseNarrative(narrativeSource);

console.log(story.diagnostics, narrative.diagnostics);
```

## DSL Snapshot
| Category | Examples |
|----------|----------|
| Declarations | `::story: id`, `::narrative: id`, `::scene: id` |
| Metadata | `@title: Text`, `@location: Place` |
| Media / Flow Symbols | `⦿` (sfx), `⬟` (vfx), `♬` (music), `⧈` (camera), `⇝` (goto), `✎` (note) |
| Character / Dialogue | `🞶 Name`, `↠` dialogue, `↪` continuation, `∵` thought |
| Structural | `¶` paragraph start |

## Scene Ordering Model
Scenes advance through strict phases:
1. Metadata (`@key:`)
2. Global Media cues (before any character)
3. Character Blocks (character line + pre‑dialogue media then dialogue / thought)
4. Paragraph Blocks (`¶`)
5. Redirections (`⇝ target`)
6. Notes (`✎ ...`)

Out‑of‑phase constructs emit diagnostics; parsing continues with partial AST.

## Validation Layers
- Structural / Ordering (scene phase enforcement)
- Semantic (0.3.0):
  - Duplicate file entries
  - Unresolved file references (user-supplied resolver)
  - Missing story start target
  - Duplicate scene IDs per narrative

See `docs/diagnostics.md` for full list and codes.

## Diff Utilities
Structural diff (added/removed/changed):
```ts
import { diffStory, diffNarrative } from '@yuxilabs/storymode-core';
const delta = diffStory(oldStoryAst, newStoryAst);
```
Narrative diff reports scene add/remove + metadata changes.

## English & Chinese Identifier Support (0.3.0)
Identifiers and metadata keys support English (Latin) and Chinese characters plus digits.

## API Surface
```ts
import {
  lexStory,
  lexNarrative,
  parseStory,
  parseNarrative,
  validateStorySemantics,
  validateNarrativeSemantics,
  diffStory,
  diffNarrative,
  STORYMODE_CORE_VERSION,
  DiagnosticCodes,
  DiagnosticSeverity
} from '@yuxilabs/storymode-core';
```
Types (`StoryFile`, `NarrativeFile`, `Scene`, `Token`, etc.) are exported for tooling.

## Versioning
`STORYMODE_CORE_VERSION` reflects the runtime version (current: `0.3.0`). While `<1.0.0` minor bumps may still introduce controlled breaking changes; patch bumps aim to be safe.

## Non-Goals (Core Package)
- Multi-file project graph orchestration
- Runtime compilation / codegen
- CLI (lives elsewhere)
- Advanced semantic cross-file analysis beyond what is listed above

## Roadmap (Indicative)
- Optional Unicode normalization & full-width punctuation mapping
- Richer diff (dialogue/media/paragraph content granularity)
- Additional semantic rules (unused files, cross-narrative scene target validation)
- Potential migration helpers when grammar evolves

## Contributing
Issues and PRs welcome. Please run:
```bash
npm test && npm run build
```
Before submitting.

## License
Released under the MIT License – see `LICENSE`.

© 2025 William Sawyerr
