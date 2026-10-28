# Progress

Newest first. One entry per idleflow run, written by the retro agent after the merge.
Humans may add entries by hand for work done outside idleflow. Keep each entry short: what
landed, what it unblocks, what is still open. This file is the answer to "where are we?".

## Milestones

Milestones are a build order, not dates; each ends deployed and usable. The capabilities and
their "done when" live in `prd.md`.

### M1: Ray bench — users can test the eye hypothesis on a deployed bench with all twelve object kinds

- [x] Engine as a standalone TypeScript package (20261026-163917-milestone-1-ray-bench)
- [x] Accuracy oracles in CI (20261026-163917-milestone-1-ray-bench)
- [x] Versioned scene JSON with link encodings (20261026-163917-milestone-1-ray-bench)
- [x] Save and load as a file; browser storage keeps the last scene (20261026-163917-milestone-1-ray-bench)
- [x] Twelve object kinds (20261026-163917-milestone-1-ray-bench)
- [x] Ray physics (20261026-163917-milestone-1-ray-bench)
- [x] Readouts that state their assumptions (20261026-163917-milestone-1-ray-bench)
- [x] 2D brightness with a "3D equivalent" toggle (20261026-163917-milestone-1-ray-bench)
- [x] Responsiveness (20261026-163917-milestone-1-ray-bench)
- [x] Eye path analysis with fixed exposure (20261026-163917-milestone-1-ray-bench)
- [x] Undo and redo (20261026-163917-milestone-1-ray-bench)
- [x] Touch on phone and tablet (20261026-163917-milestone-1-ray-bench)
- [x] Accessible to WCAG AA (20261026-163917-milestone-1-ray-bench)
- [x] Example scenes in the header (20261026-163917-milestone-1-ray-bench)
- [x] Look (20261026-163917-milestone-1-ray-bench)
- [ ] Public repository, CI on every push and a Vercel deployment
- [x] Scene fields bounded to the inspector's ranges (20261027-122603-bound-scene-fields-eye-budget)

### M2: Beginner bench — a newcomer builds a scene from an empty bench and reads what it shows

- [x] Clean slate (5bbc3e0)
- [x] New objects land in a free spot (5bbc3e0)
- [x] Toolbar tooltips (20261027-163103-milestone-2-beginner-bench-rest)
- [x] Grid and snapping (adf1149)
- [x] Eye made readable (46857e9)
- [x] Images without an eye (20261027-163103-milestone-2-beginner-bench-rest)
- [x] Lens set by focal length (7ce77fe)
- [x] Detector that teaches (20261027-163103-milestone-2-beginner-bench-rest)
- [x] Guide page (20261027-163103-milestone-2-beginner-bench-rest)

### M3: Lens and mirror shapes — concave, meniscus and custom 2D lenses and mirrors on the bench

- [ ] Concave and meniscus lenses
- [ ] Custom 2D lens and mirror shapes

### M4: Learn playlist — guided, replayable ray lessons

- [ ] A playlist of lessons, one idea and one or two tools each
- [ ] The learner builds each scene
- [ ] Lessons can be replayed; a first visit opens the playlist
- [ ] Image lessons use the image arrows and their orientation labels

### M5: Physical eye, vision and camera — a model eye with vision conditions, spectacles, colour vision deficiency and camera projections, offline

- [ ] Camera view with a projection switch
- [ ] Physical model eye
- [ ] Vision conditions
- [ ] Spectacles with a suggested lens
- [ ] Colour vision deficiency
- [ ] Offline PWA

### M6: Rough surfaces — the eye sees matte objects within the speed budgets

- [ ] Roughness from polished to matte

### M7: Wave lab — slits and gratings with the Huygens sum measured against theory

- [ ] Single slit, double slit and grating
- [ ] Wave sum never blocks the interface
- [ ] Rays / Waves switch
- [ ] Wave lessons and a wave section in the Guide

### M8: GRIN glass and ray-mode grating — curved rays in graded glass; grating orders with wave-theory intensities

- [ ] Gradient-index glass
- [ ] Ray-mode diffraction grating

### M9: Ripple view — waves spreading on a GPU grid

- [ ] GPU wave grid

## Log

<!-- progress start -->

## 2026-10-28 — session end

- Landed: the throttling page under the console gate (8cfdfaf), intercepted real images hidden (f4edcc0), and the rule written into `prd.md` in place of the known-gap sentence (66e94ec).
- Next: `git push` (12 commits) and confirm CI on master.
- Then: link Vercel and deploy, closing milestone 1.

## 2026-10-28 — An intermediate image that a later optic intercepts is drawn and labelled "Real image" (run 20261028-164942-intermediate-image-real-label, Sayantan)

- Landed: a real image is hidden when every ray of its light path ends at a surface before the rays meet; in a two-lens line only the chain's final image is drawn and labelled, with its kind, orientation and size unchanged (`packages/engine/src/images.ts`, `images.test.ts`). Merged locally as `f4edcc0`, not pushed. Showing the intermediate image as a virtual object was not built.
- Checks: `pnpm check` green locally; CI on the task branch run 40682166090 passed `check` and `e2e`, image arrows 27.6 ms under the 55 ms budget.
- Unblocks: the known gap at `prd.md` line 120 is closed; that sentence still reads as open and is left for a human edit.
- Next: push master and confirm CI on the merge commit; then milestone 3 (concave and meniscus lenses).

## 2026-10-28 — The throttling-check page runs under the console gate (run 20261028-155412-perf-beforeall-page-gate, Sayantan)

- Landed: the page the worker throttling check opens in `beforeAll` fails the file on a console error, warning or uncaught exception, and closes whether or not the check throws (`apps/web/e2e/perf.spec.ts`, `test.ts`, `console-gate.spec.ts`). Merged locally as `8cfdfaf`, not pushed.
- Checks: `pnpm check` green (198 tests); `pnpm e2e` 29 of 29 locally; CI on the task branch run 40677992361 29 of 29, throttling line printed, no `error:`, `warning:` or `uncaught:` lines.
- Unblocks: review findings F1 and F2 of run 20261028-142214-perf-tests-ci-flaky are closed.
- Next: push master and confirm CI on the merge commit; then the lens-chain intermediate image fix.

## 2026-10-28 — The engine budget e2e tests fail intermittently on the GitHub runner (run 20261028-142214-perf-tests-ci-flaky, Sayantan)

- Landed: every budget test in `apps/web/e2e/perf.spec.ts` prints its reading and budget on a pass; the image-arrows budget is 55 ms, twice the largest of three CI readings (25.6 ms). The earlier branch is merged: 25 s cap on the scene tests, `list` reporter, worker throttling check, one test per scene. Merge `8ecf75f` is pushed; CI on master `cfd79ed` (run 40671310082) passed both jobs, 27 of 27.
- Checks: `pnpm check` green (engine 172, web 198 tests); `pnpm e2e` 27 of 27 locally; CI on the task branch (run 40663737117, 1d7aba3) 27 of 27 in three attempts, image arrows 30.8, 28.0 and 22.0 ms under 55.
- Unblocks: the 25 s cap held in CI (dense-source and ball eye peak at 12.3 s). The 12.5 s target is dropped; the cap is the guard.
- Next: fix review findings F1 and F2 in `perf.spec.ts`; Vercel link and first deploy (human steps).

## 2026-10-28 — idleflow set up (run 20261028-141927-setup)

- Readability mode `balanced`; project docs on and in git; lessons in `.idleflow/lessons.md`.
- Repo commands in `.idleflow/conventions.md` "Repo fit": gate `pnpm check`, worktree setup `corepack pnpm install --frozen-lockfile`, preview `pnpm dev --port 5173 --strictPort` at `http://localhost:5173`.
- `index.md` layout, commands, milestones and dependencies are generated blocks kept by `run.sh docs`.
- Stack (13 decisions) and tooling (17 entries) were already recorded; nothing installed.
- Next: the engine budget e2e tests on CI, building on branch `idleflow/20261028-124429-engine-budget-e2e-timeout/T1`.

## 2026-10-27 — Milestone 2: beginner bench (run 20261027-163103-milestone-2-beginner-bench-rest)

- Images without an eye: each extended object is imaged through mirrors, lenses and balls, virtual images dashed and real ones solid, with kind, orientation and size labels; a Show images switch saves in the scene, which is now scene format v3 (`packages/engine/src/images.ts`, `apps/web/src/bench/draw-images.ts`, `scene.ts`, `migrate.ts`). Capped at 50 object–optic pairs and 80 arrows.
- Teaching detector with a verdict, a white-card strip, a brightness graph and a one-sentence explanation per readout (`apps/web/src/panels/detector-verdict.ts`, `detector-graph.ts`, `DetectorPanel.tsx`, `object-readouts.ts`); toolbar tooltips on every tool (`Toolbar.tsx`, `tool-descriptions.ts`); a Guide dialog from the header covering every tool and readout (`Guide.tsx`, `guide-entries.ts`).
- Checks: `pnpm check` green (engine 172 tests, web 198); `pnpm e2e` 25 of 25 locally. The cap scene's images pass measures 12.8 ms locally, against a 40 ms CI budget.
- Unblocks: milestone 3 (lens and mirror shapes). Milestone 2 is pushed to `master` but not deployed or tagged. CI on 0527b77 (run 40515777853): `check` passed; `e2e` passed 24 of 25, failing "the engine stays inside its budget at a 4x slower CPU" on Playwright's 30 s test timeout (it also timed out once on the T1 branch and passed on rerun).
- Next: hide or relabel an intermediate image that a later optic intercepts (a two-lens line labels the first lens's image "Real image" when the second lens catches the light first); make "the engine stays inside its budget" (`apps/web/e2e/perf.spec.ts`) finish inside 30 s on the GitHub runner every time (it passed on b16d191, run 40516871280, and failed again on f57c8b4, run 40647907278); Vercel link, first deploy, then the `v0.1.0` tag for milestone 1 and `v0.2.0` for milestone 2 (human steps).

## 2026-10-27 — Bounded scene fields and magnifier eye budget (run 20261027-122603-bound-scene-fields-eye-budget)

- Every scene field is bounded to the inspector ranges by the schema, with at most 500 objects (`packages/engine/src/scene.ts`, `migrate.ts`); edits clamp in `apps/web/src/store.ts` and inspector values in `apps/web/src/panels/inspector-fields.ts`; the bench caps hatch marks and ruler ticks (`apps/web/src/bench/draw.ts`).
- The eye pass stops emitting at its segment cap and aims cone rays at the pupil (`packages/engine/src/trace.ts`, `eye.ts`): the magnifier eye pass traces 18,325 segments (was 91,787) and its share of the source entering the pupil is 0.1687 (was 0.1690).
- Magnifier eye annotation measured 16.0 to 16.4 ms at 4x CPU over three runs (CI measured 201.6 ms before the fix; the budget is 100 ms in the e2e assertion, 40 ms in the plan). Local `pnpm check` is green (engine 154 tests, web 151) and `pnpm e2e` passes 21 of 21.
- CI passed both jobs on 9fc28d7 (run 40492890290). Vercel link and first deploy, and the `v0.1.0` tag, remain human steps (`docs/handoffs/handoff_01.md`).

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

