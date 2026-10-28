# Index

A map of this repository for a reader who has never opened it: what each top-level
directory and important file is for, in one line each. Rewritten by the idleflow retro agent
after every run so it never goes stale. Paths, not prose. Under 80 lines.

## Start here
- `prd.md` — what this project is and is not, must-do items with their tests
- `progress.md` — milestone checklist, what has landed and what is next
- `.idleflow/conventions.md` — how code is written here, stack and library decisions, tooling
- `CLAUDE.md` — working rules for every Claude Code session in this repo
- `docs/handoffs/handoff_02.md` — what the next session does first
- `docs/sessions/s_0005.md` — the latest session note; `docs/sessions/` holds the rest

## Layout
- `packages/engine/` — DOM-free engine: ray tracing, eye analysis, images, waves, scene schema and links
  - `packages/engine/src/trace.ts`, `spatial-grid.ts`, `geometry.ts`, `materials.ts`, `focal.ts` — ray physics
  - `packages/engine/src/eye.ts` — eye path analysis at fixed exposure
  - `packages/engine/src/images.ts` — images of extended objects without an eye, with the pair and arrow caps
  - `packages/engine/src/waves.ts` — `computeWaves` for the wave lab
  - `packages/engine/src/scene.ts`, `migrate.ts`, `links.ts` — scene JSON (format v3), migrations, `#z.`/`#j.` links
  - `packages/engine/src/examples.ts`, `overlap.ts` — example scenes, glass overlap warning
  - `packages/engine/test/fixtures/links.json` — link fixtures shared by the tests
- `apps/web/` — the React app: bench canvas, panels, engine worker
  - `apps/web/src/bench/` — p5 bench canvas: `draw.ts`, `draw-images.ts` (image arrows), `gestures.ts`, `keyboard.ts`, `view.ts`
  - `apps/web/src/panels/Toolbar.tsx`, `tool-descriptions.ts` — toolbar with tooltips
  - `apps/web/src/panels/Inspector.tsx`, `inspector-fields.ts` — inspector, scene settings, focal length slider
  - `apps/web/src/panels/DetectorPanel.tsx`, `detector-verdict.ts`, `detector-graph.ts` — the teaching detector
  - `apps/web/src/panels/object-readouts.ts`, `eye-readouts.ts`, `readouts.ts` — readouts with their explanations
  - `apps/web/src/panels/Guide.tsx`, `guide-entries.ts` — the Guide dialog and its entries
  - `apps/web/src/panels/Header.tsx`, `EmptyBenchHint.tsx`, `file.ts`, `share.ts`, `examples.ts` — header, first-visit hint, file, share, examples
  - `apps/web/src/components/ui/` — shadcn/ui components
  - `apps/web/src/store.ts` — scene state with undo and redo
  - `apps/web/src/shortcuts.ts` — window keyboard shortcuts for undo, redo and editing
  - `apps/web/src/storage.ts`, `startup.ts` — browser-storage persistence and startup order
  - `apps/web/src/engine-worker.ts`, `engine-client.ts` — engine in a Web Worker through Comlink
  - `apps/web/e2e/` — Playwright suite: touch, keyboard, links, accessibility, speed
- `reference/` — prototype code split by module, the source the engine was ported from
  - `reference/README.md` — what each folder holds and how to port it
  - `reference/checks/verify.mjs` — the prototype's physics oracles
  - `reference/ui-mockup/` — the two complete prototype screens
- `docs/` — vision, research, handoffs and session notes
  - `docs/vision.md` — physics models, accuracy oracles, look tokens, eye and wave design
  - `docs/market-research.md` — competitors, their users' complaints, the gap
  - `docs/research/` — stack, library and tooling research with sources and decisions
  - `docs/handoffs/` — what the next session does first, one file per handoff
  - `docs/sessions/` — one note per session, `TEMPLATE.md` for new ones
- `.github/workflows/ci.yml` — CI: a check job (`pnpm check`) and an e2e job
- `.idleflow/conventions.md`, `.idleflow/lessons.md` — conventions and lessons recorded by idleflow runs
- `playwright.config.ts`, `vercel.json` — browser test setup; Vercel build and install config
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` — workspace root, members, lockfile
- `tsconfig.base.json`, `biome.json` — shared TypeScript and lint/format settings
- `.node-version` — Node 24 for local, CI and Vercel
- `README.md` — commands and layout
- `LICENSE` — GPL-3.0

## Run it
Node 24 and the pnpm version pinned in `package.json` (Corepack provides it).
- Enable pnpm: `corepack enable` (once per machine)
- Install: `pnpm install`
- Start: `pnpm dev` (the app on a local Vite server)
- Test: `pnpm test` (vitest in every workspace package)
- Check: `pnpm check` (biome, type checks and unit tests)
- Browser tests: `pnpm e2e` (Playwright against a production build)
- Prototype oracles: `node reference/checks/verify.mjs`
