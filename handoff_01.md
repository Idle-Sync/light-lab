# Handoff 01 — start of the next session

Milestone 1 (the ray bench) is merged and pushed to `Idle-Sync/light-lab` `master`. It is not deployed and not tagged.

CI is red on its first run (run 40334623127): the `check` job passes; the `e2e` job passes 17 of 18. The failure is `apps/web/e2e/perf.spec.ts:98`, the magnifier eye analysis at 4x throttling: 201.6 ms scaled on the GitHub runner against the 100 ms budget (about 80 ms on an Apple M-series machine).

## Do first, in order

0. **Fix the scene-size security findings before deploying.** A crafted `#z.` link or saved scene can set huge values (for example `rays`, `length`, `radius`) that the schema accepts, so the tracer and the draw loops (mirror hatching and ruler ticks in `apps/web/src/bench/draw.ts`, `raysPerPoint` in `packages/engine/src/trace.ts`) run for minutes. The scene is then saved to browser storage, so the tab freezes again on every reload. Fix: bound every numeric field in the valibot `sceneSchema` to the inspector slider ranges, clamp `raysPerPoint` in the drawing pass, stop emitting once `maxSegments` is reached, and cap hatch and tick counts per draw. Add a test that opens a scene with extreme values and stays within budget. Run it as `/idleflow:fix`.

1. **Restart Claude Code.** idleflow 0.1.7 is downloaded but only becomes active after a restart (per-task retries, the PRD-template fix).
2. **Switch the machine to pnpm 12.** Homebrew's pnpm 9 cannot read the lockfile. Run `brew uninstall pnpm && corepack enable` (or prefix commands with `corepack pnpm` until then).
3. **Check the app by eye.** `pnpm install && pnpm dev`, then compare against `reference/ui-mockup/ray-bench.dc.html` (the prototype artifact): ray glow at focus points, eye strip, inspector readouts, Share, the three example scenes, phone width.
4. **Make CI green.** Decide on the magnifier eye budget, which fails on GitHub's runner (201.6 ms scaled vs 100 ms). Options: speed up the eye pass (fewer dense rays aimed at the pupil, the per-ray cost in `nearestHit`), which helps real slow devices too; or measure the budget relative to a calibration trace on the same machine so slower runners do not fail a fixed number. Run it as `/idleflow:fix` together with item 0.
5. **Link Vercel and deploy**, then check the production URL opens the bench and pull requests get preview URLs.
6. **Tag the release** once CI is green and the deploy works:
   ```
   git tag -a v0.1.0 -m "v0.1.0: Ray bench" && git push --tags
   gh release create v0.1.0 --title "v0.1.0 — Ray bench" --notes-file <milestone 1 entries from progress.md>
   ```

## Then

- **Test the eye feature with real users.** Market research found no demand evidence for it, so milestone 1 is where to learn whether people use it.
- **Start milestone 2, the wave lab:** `/idleflow:feature "Milestone 2: Wave lab"`. The engine side (`computeWaves`, its three oracles) already exists in `packages/engine/src/waves.ts`; the UI, the Rays / Waves switch and wave fields in the scene JSON are the work.

## Known gaps and open items

| Item | Where |
|---|---|
| Chromium cannot throttle Web Workers, so worker timings in the speed test are scaled by the rate, not measured slowed | `apps/web/e2e/perf.spec.ts` |
| Magnifier eye analysis is about 20 ms at full speed (80 ms scaled); the eye pass traces about 92,000 segments; adaptive dense rays would cut it | `packages/engine/src/eye.ts`, `spatial-grid.ts` |
| The eye strip is drawn inside the bench canvas, not its own panel | `apps/web/src/bench/draw.ts` (`drawEyeStrip`) |
| Product name: "Light Lab" is a working title | `prd.md` Open questions |
| Two skills to request, if wanted: `/idleflow:skills-feedback "optics oracle check: run the physics oracles and report each result against the documented value"` and `/idleflow:skills-feedback "scene-link migration fixtures: add a sample versioned link per format change and verify every old link migrates"` | `docs/research/tooling.md` |

## Where to read

- `progress.md`, `docs/sessions/s_0002.md`: what milestone 1 landed
- `prd.md`: milestones 2 to 5 and every "done when"
- `docs/vision.md`: physics models and accuracy oracles
- `session_01.md`: everything decided in this session
