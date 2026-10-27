# Handoff 01 — start of the next session

Milestone 1 (the ray bench) is merged and pushed to `Idle-Sync/light-lab` `master`. It is not deployed and not tagged.

CI was red on its first run (run 40334623127): the `check` job passed; the `e2e` job passed 17 of 18, failing on the magnifier eye analysis at 4x throttling (`apps/web/e2e/perf.spec.ts`, 201.6 ms scaled against the 100 ms budget). The eye pass now traces about a fifth of the segments; whether the magnifier check passes on the GitHub runner awaits the next CI run.

## Do first, in order

1. **Restart Claude Code.** idleflow 0.1.7 is downloaded but only becomes active after a restart (per-task retries, the PRD-template fix).
2. **Switch the machine to pnpm 12.** Homebrew's pnpm 9 cannot read the lockfile. Plain `pnpm` is 12.15.0 via corepack on the current machine; elsewhere run `brew uninstall pnpm && corepack enable` (or prefix commands with `corepack pnpm` until then).
3. **Check the app by eye.** `pnpm install && pnpm dev`, then compare against `reference/ui-mockup/ray-bench.dc.html` (the prototype artifact): ray glow at focus points, eye strip, inspector readouts, Share, the three example scenes, phone width.
4. **Link Vercel and deploy**, then check the production URL opens the bench and pull requests get preview URLs.
5. **Tag the release** once CI is green and the deploy works:
   ```
   git tag -a v0.1.0 -m "v0.1.0: Ray bench" && git push --tags
   gh release create v0.1.0 --title "v0.1.0 — Ray bench" --notes-file <milestone 1 entries from progress.md>
   ```

## Then

- **Test the eye feature with real users.** Market research found no demand evidence for it, so milestone 1 is where to learn whether people use it.
- **The wave lab is milestone 7 since 2026-10-27; milestone 2 is the beginner bench (`prd.md`).** The engine side (`computeWaves`, its three oracles) already exists in `packages/engine/src/waves.ts`; the UI, the Rays / Waves switch and wave fields in the scene JSON are the work.

## Known gaps and open items

| Item | Where |
|---|---|
| Chromium cannot throttle Web Workers, so worker timings in the speed test are scaled by the rate, not measured slowed | `apps/web/e2e/perf.spec.ts` |
| Magnifier eye pass traces 18,325 segments (was 91,787) and the ball 28,884, both within the accuracy tolerances; cone rays are spaced 0.05° to 1°, 24 across the pupil, and every cone keeps the dense 0.05° spacing when the scene has an arc mirror anywhere | `packages/engine/src/trace.ts` (`raysPerPoint`, `pupilAim`) |
| The eye strip is drawn inside the bench canvas, not its own panel | `apps/web/src/bench/draw.ts` (`drawEyeStrip`) |
| Product name: "Light Lab" is a working title | `prd.md` Open questions |
| Two skills to request, if wanted: `/idleflow:skills-feedback "optics oracle check: run the physics oracles and report each result against the documented value"` and `/idleflow:skills-feedback "scene-link migration fixtures: add a sample versioned link per format change and verify every old link migrates"` | `docs/research/tooling.md` |

## Where to read

- `progress.md`, `docs/sessions/s_0002.md`: what milestone 1 landed
- `prd.md`: milestones 2 to 9 and every "done when"
- `docs/vision.md`: physics models and accuracy oracles
- `docs/sessions/session_01.md`: everything decided in this session
