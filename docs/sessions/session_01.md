# Session 01 — 2026-10-26

From an idea ("a light simulator like phydemo, but modern and accurate") to milestone 1 built, reviewed and merged on `master`.

## Decided

| Area | Decision |
|---|---|
| Product | 2D only, browser. Ray bench, an observer eye, a wave lab (slits and gratings), every number computed from physics |
| Accuracy | Sellmeier glass data, Fresnel equations, total internal reflection, exact Huygens–Fresnel sums; oracles in `reference/checks/verify.mjs` and the engine tests |
| Eye | Ray-computed view with fixed exposure; point sources keep their size and only get brighter; camera projections with fisheye correction and a physical model eye come in milestone 5 |
| Stack | pnpm 12 workspace, Node 24, Vite, TypeScript strict, React, Tailwind, shadcn/ui, p5 instance mode, engine in a Web Worker through Comlink, Biome, Vitest, Playwright, GitHub Actions, Vercel |
| Engine API | Pure functions over plain data: `trace(scene)`, `analyzeEye(scene, eyeId)`, `computeWaves(setup)`, `migrateScene(json)` |
| Scene links | Created by a Share button, never written live; `#z.` deflate + base64url written, `#z.` and `#j.` read; versioned with migrations that are never deleted |
| Libraries | valibot for scene validation, p5 WEBGL for the ripple view; spatial index, undo/redo and gestures hand-written |
| Repo | Public `Idle-Sync/light-lab`, GPL-3.0, docs in git, tagged releases per milestone, no Claude attribution |
| Scope additions | GRIN glass, ray-mode grating and ripple view are in v1 (milestones 4 and 5); the deadline is no longer fixed |
| Speed | Eye analysis budget is 100 ms at 4x CPU throttling (relaxed from 60 ms; it runs off the main thread) |

## Built

1. **Prototype artifact**: https://claude.ai/artifact/BgtvfeScDSRTSffJxucuqP (ray bench with eye, wave lab). Its code is split by module under `reference/`.
2. **Research**: `docs/market-research.md` (verdict: crowded; competitors' complaints became must-do items), stack, library and tooling research in `docs/research/`.
3. **Project setup** with `/idleflow:init`: `prd.md` (5 milestones), `CLAUDE.md`, `.claude/conventions.md`, `progress.md`, `index.md`, `README.md`, `LICENSE`.
4. **Milestone 1, the ray bench** with `/idleflow:feature` (run `20261026-163917-milestone-1-ray-bench`, size L, six tasks):

| Task | What landed |
|---|---|
| T0 | Workspace, engine skeleton (scene schema, glass data, link encoding with size caps), store with undo, worker client, app skeleton, CI, Vercel config |
| T1 | Ray physics and eye analysis, spatial index, measured focal length, glass overlap check |
| T2 | Wave sum and Fraunhofer comparison, scene migrations, storage, link fixtures |
| T3 | Header (examples, Share, save/open file), toolbar, inspector with readouts and "assumes" lines, shortcuts |
| T4 | p5 bench canvas with additive ray glow, gestures, keyboard nudging, eye strip, status pill |
| T5 | Integration fixes, exact 3D detector rule, one undo step per slider drag, Playwright suite (touch, keyboard, links, accessibility, speed), README, `docs/sessions/s_0002.md` |

Verification on `master`: `pnpm check` (Biome, strict types, 174 unit tests), `pnpm e2e` (18 of 18), `node reference/checks/verify.mjs` (all pass).

Pushed to `Idle-Sync/light-lab` `master`. First CI run: `check` passes; `e2e` passes 17 of 18, the magnifier eye budget fails on the GitHub runner (201.6 ms scaled vs 100 ms).

A security review of the pushed code found that scene fields have no upper bounds, so a crafted link or saved scene can freeze the tab on every load; the fix is item 0 in `docs/handoffs/handoff_01.md`.

## Problems found and fixed during review

- Decompression bomb in link decoding: links capped at 64K characters and 1 MB inflated.
- 3D-equivalent detector could read above 100 % near a source: replaced with the exact square-sensor ratio `asin(a²/(1+a²)) / atan(a)`.
- Eye angle units differed between the physics and canvas tasks (radians vs degrees): reconciled in T5.
- Blocked browser storage blanked the app; a missing clipboard broke Share; fast link clicks could open the wrong scene; a broken link could overwrite the saved scene: all fixed with tests.

## Filed

- Idle-Sync/idleflow issues #8 (fixed in 0.1.7), #9, #10, #11, #12, and #13 (`/idleflow:endsession`: a handoff and a whole-session summary, offered by Claude with a yes from the human when it is safe to run).
