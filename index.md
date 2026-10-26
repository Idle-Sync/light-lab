# Index

A map of this repository for a reader who has never opened it: what each top-level
directory and important file is for, in one line each. Rewritten by the idleflow retro agent
after every run so it never goes stale. Paths, not prose. Under 80 lines.

## Start here
- `prd.md` — what this project is and is not, must-do items with their tests, milestones
- `progress.md` — what has landed and what is next
- `.claude/conventions.md` — how code is written here, stack and library decisions, tooling
- `CLAUDE.md` — working rules for every Claude Code session in this repo
- `handoff_01.md` — what the next session does first
- `session_01.md` — what the first session decided and built

## Layout
- `packages/engine/` — DOM-free engine: ray tracing, eye analysis, waves, scene schema and links
  - `packages/engine/src/trace.ts`, `spatial-grid.ts`, `geometry.ts`, `materials.ts`, `focal.ts` — ray physics
  - `packages/engine/src/eye.ts` — eye path analysis at fixed exposure
  - `packages/engine/src/waves.ts` — `computeWaves` for the wave lab
  - `packages/engine/src/scene.ts`, `migrate.ts`, `links.ts` — scene JSON, migrations, `#z.`/`#j.` links
  - `packages/engine/src/examples.ts`, `overlap.ts` — example scenes, glass overlap warning
  - `packages/engine/test/fixtures/links.json` — link fixtures shared by the tests
- `apps/web/` — the React app: bench canvas, panels, engine worker
  - `apps/web/src/bench/` — p5 bench canvas, drawing, gestures, keyboard editing
  - `apps/web/src/panels/` — header, toolbar, inspector, readouts, share, file
  - `apps/web/src/store.ts` — scene state with undo and redo
  - `apps/web/src/storage.ts`, `startup.ts` — browser-storage persistence and startup order
  - `apps/web/src/engine-worker.ts`, `engine-client.ts` — engine in a Web Worker through Comlink
  - `apps/web/e2e/` — Playwright suite: touch, keyboard, links, accessibility, speed
- `reference/` — prototype code split by module, the source the engine was ported from
  - `reference/README.md` — what each folder holds and how to port it
  - `reference/checks/verify.mjs` — the prototype's physics oracles
  - `reference/ui-mockup/` — the two complete prototype screens
- `docs/` — vision, research and session notes
  - `docs/vision.md` — physics models, accuracy oracles, look tokens, eye and wave design
  - `docs/market-research.md` — competitors, their users' complaints, the gap
  - `docs/research/` — stack, library and tooling research with sources and decisions
  - `docs/sessions/` — one note per session, `TEMPLATE.md` for new ones
- `.github/workflows/ci.yml` — CI: `pnpm check` and the Playwright job
- `playwright.config.ts`, `vercel.json` — browser test setup; Vercel build and install config
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` — workspace root, members, lockfile
- `tsconfig.base.json`, `biome.json` — shared TypeScript and lint/format settings
- `.node-version` — Node 24 for local, CI and Vercel
- `LICENSE` — GPL-3.0
- `.claude/lessons.md` — lessons recorded by idleflow runs

## Run it
Node 24 and the pnpm version pinned in `package.json` (Corepack provides it).
- Enable pnpm: `corepack enable` (once per machine)
- Install: `pnpm install`
- Start: `pnpm dev` (the app on a local Vite server)
- Test: `pnpm test` (vitest in every workspace package)
- Check: `pnpm check` (biome, type checks and unit tests)
- Browser tests: `pnpm e2e` (Playwright against a production build)
- Prototype oracles: `node reference/checks/verify.mjs`
