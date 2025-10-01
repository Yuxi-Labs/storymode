# Changelog

Changelog of user‑visible changes to grammar, diagnostics, tooling, and documentation. Each release groups what was added, changed, validated (tests / docs), and maintained.

## 0.3.0 - 2025-10-02
### Added
- Semantic validation: duplicate file entries, unresolved file references (with resolver), missing story start target, duplicate scene IDs per narrative.
- Structural diff utilities: `diffStory`, `diffNarrative`.
- English & Chinese identifier support in lexers (story + narrative).
- Ordering validator extracted for clearer phase diagnostics.

### Changed
- ESM compliance: explicit `.js` extension imports; `tsconfig` switched to `NodeNext`.
- Documentation reorganized and deduplicated (README overhaul).

### Tests / Docs
- Added tests: semantics, ordering separation, diff, Unicode identifiers.
- Updated `docs/diagnostics.md` with new diagnostic codes.
- Updated `docs/grammar.md` for identifier support clarification.

### Housekeeping
- Added MIT `LICENSE` file and aligned README license section.

## 0.2.0 - 2025-09 (baseline)
### Added
- Initial lexers (`lexStory`, `lexNarrative`) and parsers (`parseStory`, `parseNarrative`).
- Core AST & diagnostic types.
- Basic ordering rules embedded inside narrative parsing.

---
For earlier internal prototypes prior to 0.2.0, changes were not tracked in this file.
