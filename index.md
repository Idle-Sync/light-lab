# Index

A map of this repository for a reader who has never opened it. The blocks between
`idleflow:generated` and `idleflow:end` markers are written by `run.sh docs` from the repo itself
and checked by `/idleflow:doctor`; edit only the one-line descriptions after the dashes, and
everything outside the markers.

## Start here
- `prd.md` — what this project is and is not, must-do items with their tests
- `progress.md` — milestone checklist, what has landed and what is next
- `.idleflow/conventions.md` — how code is written here, stack and library decisions, tooling
- `CLAUDE.md` — working rules for every Claude Code session in this repo
- `docs/handoffs/handoff_02.md` — what the next session does first
- `docs/sessions/s_20261028-1822-sayantan.md` — the latest session note; `docs/sessions/` holds the rest

## Layout
<!-- idleflow:generated files -->
- `.gitattributes` — union merges for `progress.md` and the idleflow lessons and suggestions files
- `.github/` — CI in `workflows/ci.yml`: a check job (`pnpm check`) and an e2e job
- `.gitignore` — build output, dependencies and local files kept out of git
- `.idleflow/` — idleflow conventions (code style, stack and library decisions, tooling), lessons and suggestions; `runs/` stays local
- `.node-version` — Node 24 for local, CI and Vercel
- `CLAUDE.md` — working rules for every Claude Code session in this repo
- `LICENSE` — GPL-3.0
- `README.md` — commands and layout
- `apps/` — `apps/web/`, the React app: p5 bench canvas in `src/bench/` (`draw.ts`, `draw-images.ts`, `gestures.ts`, `keyboard.ts`, `view.ts`), panels in `src/panels/` (toolbar, inspector, teaching detector, readouts, Guide, header), shadcn/ui in `src/components/ui/`, scene state with undo in `src/store.ts`, browser storage in `src/storage.ts`, the engine worker in `src/engine-worker.ts` and `engine-client.ts`, the Playwright suite in `e2e/`
- `biome.json` — lint and format settings
- `docs/` — `vision.md` (physics models, oracles, look tokens), `market-research.md`, `research/` (stack, library and tooling decisions with sources), `handoffs/` (what the next session does first), `sessions/` (one note per session, `TEMPLATE.md`)
- `index.md` — this map
- `package.json` — workspace root scripts and dev dependencies; pins pnpm through `packageManager`
- `packages/` — `packages/engine/`, the DOM-free engine: ray physics (`trace.ts`, `spatial-grid.ts`, `geometry.ts`, `materials.ts`, `focal.ts`), eye analysis (`eye.ts`), images without an eye (`images.ts`), waves (`waves.ts`), scene format v3, migrations and links (`scene.ts`, `migrate.ts`, `links.ts`), examples and overlap warning; link fixtures in `test/fixtures/`
- `playwright.config.ts` — browser test setup against a production build on port 4173
- `pnpm-lock.yaml` — lockfile
- `pnpm-workspace.yaml` — workspace members
- `prd.md` — what this project is and is not, must-do items with their tests
- `progress.md` — milestone checklist, what has landed and what is next
- `reference/` — prototype code the engine was ported from: `README.md` (how to port it), `checks/verify.mjs` (physics oracles), `ui-mockup/` (the two prototype screens)
- `tsconfig.base.json` — shared TypeScript settings
- `vercel.json` — Vercel build and install config
<!-- idleflow:end -->

## Run it
Node 24 and the pnpm version pinned in `package.json`: `corepack enable` once per machine, then
`pnpm install`. Prototype oracles: `node reference/checks/verify.mjs`.

<!-- idleflow:generated commands -->
- `pnpm check` — runs `biome ci . && pnpm -r check`
- `pnpm dev` — runs `pnpm --filter web dev`
- `pnpm e2e` — runs `playwright test`
- `pnpm test` — runs `pnpm -r test`
<!-- idleflow:end -->

## Milestones
<!-- idleflow:generated milestones -->
- M1: Ray bench: 16/17
- M2: Beginner bench: 9/9
- M3: Lens and mirror shapes: 0/2
- M4: Learn playlist: 0/4
- M5: Physical eye, vision and camera: 0/6
- M6: Rough surfaces: 0/1
- M7: Wave lab: 0/4
- M8: GRIN glass and ray-mode grating: 0/2
- M9: Ripple view: 0/1
<!-- idleflow:end -->

## Dependencies
<!-- idleflow:generated dependencies -->
- `@axe-core/playwright` ^4.14.0 — package.json (dev)
- `@biomejs/biome` ^2.6.3 — package.json (dev)
- `@playwright/test` ^1.64.1 — package.json (dev)
<!-- idleflow:end -->
