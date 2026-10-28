# Handoff 02 — start of the next session

Milestones 1 (ray bench) and 2 (beginner bench) are merged to `master`; `Idle-Sync/light-lab` `origin/master` is at cfd79ed and local `master` is ahead of it (`git rev-list --count @{u}..HEAD`). Neither milestone is deployed or tagged.

CI on cfd79ed (run 40671310082) passed both jobs, 27 of 27. The engine budget tests in `apps/web/e2e/perf.spec.ts` have a 25 s cap, and the 4x-slower-CPU tests print their reading against the budget on a pass. CI on the task branch of the last merge (run 40677992361) passed 29 of 29; CI on the merge commit is not yet confirmed.

## Do first, in order

1. **Restart Claude Code.** Two idleflow versions (0.1.5 and 0.1.7) were active together this session: the 0.1.5 worktree guard refused the 0.1.7 implementers' `.idleflow-run/result.md` on a retry. A restart loads 0.1.7 throughout.
2. **Push `master` and confirm CI on the merge commit**: the e2e job green, no `error:`, `warning:` or `uncaught:` line in its log.
3. **Fix intermediate images in a lens chain.** `/idleflow:fix "an intermediate image that a later optic intercepts is drawn and labelled Real image"`. In a two-lens line the first lens's image is labelled "Real image" although the second lens catches the light before it forms. The rule that decides real or virtual ignores where the segment ends (`packages/engine/src/images.ts`; review note in the run's `review/T1-correct.1.md`, quoted in `docs/sessions/s_0005.md`).
4. **Check the app by eye.** `pnpm dev`, open the magnifier example, and turn Show images on and off. Select the detector in the bench example to see its verdict, white-card strip and graph. Hover each toolbar tool, and open the Guide from the header.
5. **Link Vercel and deploy**, then check the production URL opens the bench.
6. **Tag the releases** once CI is green and the deploy works (`releases: github-tagged` in `CLAUDE.md`):
   ```
   git tag -a v0.1.0 <milestone 1 merge commit> -m "v0.1.0: Ray bench"
   git tag -a v0.2.0 -m "v0.2.0: Beginner bench" && git push --tags
   gh release create v0.2.0 --title "v0.2.0 — Beginner bench" --notes-file <milestone 2 entries from progress.md>
   ```

## Then

- **Milestone 3, lens and mirror shapes (`progress.md`, `prd.md`)**: concave and meniscus lenses, custom 2D shapes. Brainstorm milestones 3 to 6 before planning them.
- **Learn playlist, milestone 4**: it builds on the Guide (`apps/web/src/panels/guide-entries.ts`) and the image arrows.

## Known gaps and open items

| Item | Where |
|---|---|
| The images pass is capped at 50 object–optic pairs and 80 arrows; the cap scene measures 10.4 to 10.8 ms locally against a 55 ms budget, twice the GitHub runner's worst of three readings (25.6, 22.4 and 19.6 ms in run 40662707612) rounded up to a multiple of 5 ms | `packages/engine/src/images.ts`, `apps/web/e2e/perf.spec.ts` |
| CI prints the Playwright `list` reporter beside `github`, so a passing run shows every test's duration, the line the worker throttling check prints and the reading each perf test prints against its budget | `playwright.config.ts`, `apps/web/e2e/perf.spec.ts` |
| Chromium cannot throttle Web Workers, so worker timings in the speed tests are scaled by the rate, not measured slowed | `apps/web/e2e/perf.spec.ts` |
| Image arrows are for extended objects only; point sources and beams show their images through the eye | `prd.md` milestone 2 |
| idleflow issues opened this session: Idle-Sync/idleflow#14 (show debate cuts to the human first) and #15 (CI timing criteria cannot be quoted on a pass) | GitHub |
| Product name: "Light Lab" is a working title | `prd.md` Open questions |

## Where to read

- `progress.md`, `docs/sessions/s_0005.md`: what milestone 2 landed
- `docs/sessions/s_0004.md`: the bounded scene fields and the eye-budget fix
- `progress.md`: milestones 3 to 9; `prd.md`: every "done when"
- `.idleflow/lessons.md`: size timing budgets against the CI reading, not the local one
