# Progress

Newest first. One entry per idleflow run, written by the retro agent after the merge.
Humans may add entries by hand for work done outside idleflow. Keep each entry short: what
landed, what it unblocks, what is still open. This file is the answer to "where are we?".

<!-- progress start -->

## 2026-10-27 — Beginner bench, first half (Claude Code session)

- Scene format v2: `grid` (show, size 0.01 to 500 mm, snap) and `sightLines` settings; version 1 links and files migrate; settings at their defaults stay out of links (`packages/engine/src/scene.ts`, `migrate.ts`, `links.ts`).
- Clean slate: New button, empty first visit with a hint, objects placed clear of each other (`apps/web/src/store.ts`, `panels/Header.tsx`, `panels/EmptyBenchHint.tsx`).
- Grid lines and snap to grid on drag, add, duplicate and arrow keys (`bench/draw.ts`, `bench/view.ts`, `bench/gestures.ts`, `bench/keyboard.ts`, `panels/Inspector.tsx`).
- Eye: sight lines switch and legend, "Virtual image"/"Real image" labels, 24 mm eyeball, pupil 1 to 10 mm, eye view panel in three sizes.
- Lens focal length slider (`symmetricLensRadius` in `packages/engine/src/materials.ts`) and F markers from traced focal points (`focalPoints` in `focal.ts`).
- `prd.md` reordered into 9 milestones: beginner bench, lens shapes, Learn playlist, physical eye and vision, rough surfaces, then the wave lab.
- Next: finish milestone 2 (tooltips, teaching detector, Guide page); bound scene fields before deploying; CI and deploy are still open from milestone 1.

## 2026-10-26 — Milestone 1: ray bench (run 20261026-163917-milestone-1-ray-bench)

- Engine in `packages/engine/src`: ray tracing and detector weights (`trace.ts`, `spatial-grid.ts`), eye path analysis (`eye.ts`), waves (`waves.ts`), scene schema and migrations (`scene.ts`, `migrate.ts`), `#z.`/`#j.` links (`links.ts`), glass overlap warning (`overlap.ts`); the prototype oracles run in vitest.
- App in `apps/web/src`: p5 bench canvas with pan, zoom, touch and keyboard editing (`bench/`), header with Share, toolbar, inspector and scene settings (`panels/`), undo and redo (`store.ts`), file and browser-storage persistence (`storage.ts`, `panels/file.ts`), engine in a Web Worker (`engine-worker.ts`, `engine-client.ts`), example scenes (`packages/engine/src/examples.ts`).
- Checks: `pnpm check` (biome, per-package tsc and vitest); Playwright suite in `apps/web/e2e` (18 tests: touch, keyboard, links, accessibility, speed); CI in `.github/workflows/ci.yml` with a check job and an e2e job; `vercel.json` lands, no deploy yet.
- Completes milestone 1 of `prd.md`. `computeWaves` and its three oracles are in place for the wave lab (milestone 7 since 2026-10-27).
- Next: milestone 2 from `prd.md` (the beginner bench; the wave lab is milestone 7). Human steps: link Vercel and confirm the first deploy; fix the red CI e2e job (the magnifier eye analysis measures 201.6 ms scaled on the GitHub runner against the 100 ms budget, `apps/web/e2e/perf.spec.ts:101`; see `docs/handoffs/handoff_01.md`); tag `v0.1.0` for milestone 1 (`releases: github-tagged`).

## 2026-10-26 — project initialised (run 20261026-153831-init)

- Brainstorm done; vision in `docs/vision.md`, prototype code and physics oracles in `reference/`.
- Market research verdict: crowded. The wedge is rays, measured wave diffraction and eye path analysis in one sandbox, plus fixing the competitors' complaints (slow pan and zoom, slowdowns with many rays, numbers without theory).
- 8 stack decisions accepted, 1 declined (pre-commit hook); 5 library decisions (valibot, p5 WEBGL framebuffers, 3 hand-written); 4 tooling plugins installed.
- PRD approved: 25 must-do items, 5 milestones.
- Next: milestone 1 from `prd.md`, the ray bench.

