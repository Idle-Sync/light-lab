# Index

A map of this repository for a reader who has never opened it: what each top-level
directory and important file is for, in one line each. Rewritten by the idleflow retro agent
after every run so it never goes stale. Paths, not prose. Under 80 lines.

## Start here
- `prd.md` — what this project is and is not, must-do items with their tests, milestones
- `progress.md` — what has landed and what is next
- `.claude/conventions.md` — how code is written here, stack and library decisions, tooling
- `CLAUDE.md` — working rules for every Claude Code session in this repo

## Layout
- `docs/` — vision, research and session notes
  - `docs/vision.md` — physics models, accuracy oracles, look tokens, eye and wave design
  - `docs/market-research.md` — competitors, their users' complaints, the gap
  - `docs/research/` — stack, library and tooling research with sources and decisions
  - `docs/sessions/` — one note per session, `TEMPLATE.md` for new ones
- `reference/` — prototype code split by module, to port into the engine and web app
  - `reference/README.md` — what each folder holds and how to port it
  - `reference/checks/verify.mjs` — the prototype's physics oracles
  - `reference/ui-mockup/` — the two complete prototype screens
- `LICENSE` — GPL-3.0
- `.claude/lessons.md` — lessons recorded by idleflow runs

## Run it
- Install: `pnpm install` (once milestone 1 adds the workspace)
- Test: `pnpm test` (once milestone 1 adds the workspace)
- Start: `pnpm dev` (once milestone 1 adds the workspace)
- Prototype oracles today: `node reference/checks/verify.mjs`
