status: decided: hand-written

# undo-redo-state — library options
researched: 2026-10-26   for: Light Lab v1 (editable scene with undo and redo)   status: open

## What we need
An explicit scene model with undo and redo, shared between the React interface and the p5 canvas. The scene is plain JSON (the 9-object bench scene is 699 characters), so a full snapshot per edit is small. Engine stays free of state libraries; this lives in the web app.

## Already in the repo
Nothing covers this. The prototype keeps a mutable `this.scene` (`reference/README.md`).

## Options
### zustand + zundo
what: zustand is a small React store; zundo is a middleware that adds undo and redo (`temporal`).
install: `npm i zustand zundo`   source: https://github.com/charkour/zundo README line 16 (2026-10-26); zustand alone `npm install zustand`, https://github.com/pmndrs/zustand README
maintained: zustand yes — v5.0.16 released 2026-10-22, MIT, 4 open issues. zundo — v2.3.0 released 2024-11-17 (older than 12 months), last push 2026-01-30, MIT, 22 open issues   source: https://github.com/pmndrs/zustand , https://github.com/charkour/zundo (2026-10-26)
adoption: zustand 40,541,130 and zundo 301,499 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/zustand (2026-10-26)
fits: snapshot history suits a small JSON scene; store usable outside React so p5 can read it.
pros: very small; history in a few lines; works outside components
cons: zundo has had no release in about 23 months; snapshots grow with scene size; third-party middleware on top of zustand
sources:
- https://github.com/charkour/zundo — repo and README — 2026-10-26
- https://github.com/pmndrs/zustand — repo and README — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/zundo — independent (registry) — 2026-10-26
- https://cdn.jsdelivr.net/npm/travels@1.3.1/README.md — independent (competing library's README; says snapshot history suits small state, patches suit large documents) — fetched via search 2026-10-26

### immer (patches)
what: Immutable updates by mutation syntax; `produceWithPatches` returns patches and inverse patches usable for undo.
install: `npm install immer`   source: https://immerjs.github.io/immer/installation (2026-10-26)
maintained: yes — v11.2.9 released 2026-10-22, MIT, 44 open issues   source: https://github.com/immerjs/immer (2026-10-26)
adoption: 42,050,207 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/immer (2026-10-26)
fits: gives the undo stack and also makes scene edits simple to write; history code is written by hand on top of the patches.
pros: very active; patches keep memory low for big scenes; good for editing nested objects
cons: undo and redo stacks are hand-written; patch handling adds code for a small scene; runtime cost per edit
sources:
- https://immerjs.github.io/immer/installation — docs — 2026-10-26
- https://github.com/immerjs/immer — repo — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/immer — independent (registry) — 2026-10-26
- https://egghead.io/lessons/react-use-immer-inversepatches-to-build-undo-functionality — independent (tutorial, undated) — 2026-10-26

## Hand-written alternative
A history of scene snapshots: two arrays and push, undo, redo, and a cap, about 30 to 50 lines plus tests, with structural sharing from plain object spreading. A drag should coalesce into one history entry; that rule is the main upkeep point. Fits the "boring over clever" convention; the cost grows only if scenes become large.
