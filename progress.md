# Progress

Newest first. One entry per idleflow run, written by the retro agent after the merge.
Humans may add entries by hand for work done outside idleflow. Keep each entry short: what
landed, what it unblocks, what is still open. This file is the answer to "where are we?".

<!-- progress start -->

## 2026-10-27 — Milestone 2: beginner bench (run 20261027-163103-milestone-2-beginner-bench-rest)

- Images without an eye: each extended object is imaged through mirrors, lenses and balls, virtual images dashed and real ones solid, with kind, orientation and size labels; a Show images switch saves in the scene, which is now scene format v3 (`packages/engine/src/images.ts`, `apps/web/src/bench/draw-images.ts`, `scene.ts`, `migrate.ts`). Capped at 50 object–optic pairs and 80 arrows.
- Teaching detector with a verdict, a white-card strip, a brightness graph and a one-sentence explanation per readout (`apps/web/src/panels/detector-verdict.ts`, `detector-graph.ts`, `DetectorPanel.tsx`, `object-readouts.ts`); toolbar tooltips on every tool (`Toolbar.tsx`, `tool-descriptions.ts`); a Guide dialog from the header covering every tool and readout (`Guide.tsx`, `guide-entries.ts`).
- Checks: `pnpm check` green (engine 172 tests, web 198); `pnpm e2e` 25 of 25 locally. The cap scene's images pass measures 12.8 ms locally, against a 40 ms CI budget.
- Unblocks: milestone 3 (lens and mirror shapes). Milestone 2 is in the code but not yet pushed, deployed or tagged; the CI run on the merge commit is still to come.
- Next: hide or relabel an intermediate image that a later optic intercepts (a two-lens line labels the first lens's image "Real image" when the second lens catches the light first); the magnifier and images budget tests run near Playwright's 30 s timeout on the GitHub runner; Vercel link, first deploy, then the `v0.1.0` tag for milestone 1 and `v0.2.0` for milestone 2 (human steps).

## 2026-10-27 — Bounded scene fields and magnifier eye budget (run 20261027-122603-bound-scene-fields-eye-budget)

- Every scene field is bounded to the inspector ranges by the schema, with at most 500 objects (`packages/engine/src/scene.ts`, `migrate.ts`); edits clamp in `apps/web/src/store.ts` and inspector values in `apps/web/src/panels/inspector-fields.ts`; the bench caps hatch marks and ruler ticks (`apps/web/src/bench/draw.ts`).
- The eye pass stops emitting at its segment cap and aims cone rays at the pupil (`packages/engine/src/trace.ts`, `eye.ts`): the magnifier eye pass traces 18,325 segments (was 91,787) and its share of the source entering the pupil is 0.1687 (was 0.1690).
- Magnifier eye annotation measured 16.0 to 16.4 ms at 4x CPU over three runs (CI measured 201.6 ms before the fix; the budget is 100 ms in the e2e assertion, 40 ms in the plan). Local `pnpm check` is green (engine 154 tests, web 151) and `pnpm e2e` passes 21 of 21.
- Done locally, not yet proven on GitHub: the CI e2e job must pass on the next push. Vercel link and first deploy, and the `v0.1.0` tag, remain human steps (`docs/handoffs/handoff_01.md`).

## 2026-10-27 — Beginner bench, first half (Claude Code session)

- Scene format v2: `grid` (show, size 0.01 to 500 mm, snap) and `sightLines` settings; version 1 links and files migrate; settings at their defaults stay out of links (`packages/engine/src/scene.ts`, `migrate.ts`, `links.ts`).
- Clean slate: New button, empty first visit with a hint, objects placed clear of each other (`apps/web/src/store.ts`, `panels/Header.tsx`, `panels/EmptyBenchHint.tsx`).
- Grid lines and snap to grid on drag, add, duplicate and arrow keys (`bench/draw.ts`, `bench/view.ts`, `bench/gestures.ts`, `bench/keyboard.ts`, `panels/Inspector.tsx`).
- Eye: sight lines switch and legend, "Virtual image"/"Real image" labels, 24 mm eyeball, pupil 1 to 10 mm, eye view panel in three sizes.
- Lens focal length slider (`symmetricLensRadius` in `packages/engine/src/materials.ts`) and F markers from traced focal points (`focalPoints` in `focal.ts`).
- `prd.md` reordered into 9 milestones: beginner bench, lens shapes, Learn playlist, physical eye and vision, rough surfaces, then the wave lab.
- Next: finish milestone 2 (tooltips, teaching detector, Guide page); CI and deploy are still open from milestone 1.

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

