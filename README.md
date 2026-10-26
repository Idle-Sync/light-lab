# Light Lab

A browser-based 2D optics sandbox: place light sources, mirrors, lenses, prisms, slits and an eye, and see light traced live with every number computed from physics.

For students, teachers, optics hobbyists and engineers, and anyone curious about light.

See `prd.md`.

## Run it

Node 24 and the pnpm version pinned in `package.json` (Corepack provides it):

```
corepack enable
pnpm install
pnpm dev        # the app on a local Vite server
pnpm test       # unit tests of every workspace package
pnpm check      # biome, type checks and unit tests
pnpm e2e        # Playwright browser tests against a production build
node reference/checks/verify.mjs   # physics oracles of the prototype
```

## Layout

- `packages/engine` — ray tracing, eye analysis, waves, scene schema and links; pure functions over the scene JSON
- `apps/web` — the React app: bench canvas, panels, engine worker; browser tests in `apps/web/e2e`
- `reference/` — the prototype the engine was ported from, with its physics oracles
- `docs/` — vision, market research, library research and session notes
