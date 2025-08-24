# Chronicles of the Clockwork Sea

A richer multi-arc example demonstrating StoryMode constructs.

## Story File
`chronicles_of_the_clockwork_sea.story` declares five narrative files (one prologue + four arcs).

## Narratives & Scenes
- Prologue: `drift`, `signal`
- Arc 1: `arrival`, `workshop`
- Arc 2: `reveal`, `ignition`
- Arc 3: `charting`, `breach`
- Arc 4: `convergence`, `ascension`, `epilogue`

Each scene uses cue lines (`!sfx`, `!music`, `!vfx`) for tooling tests.

Use this folder to test:
- Parser correctness across multiple arcs
- Table of Contents generation
- Preview pagination
- Workspace navigation (click file list)
- Diagnostics (add mismatched ::end to see errors)
