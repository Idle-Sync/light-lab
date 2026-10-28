# Handoff 02 — start of the next session

Milestones 1 (ray bench) and 2 (beginner bench) are merged and pushed to `Idle-Sync/light-lab` `master` at 0527b77. Neither is deployed or tagged.

CI on 0527b77 (run 40515777853) is red; on master since then b16d191 (run 40516871280) passed and f57c8b4 (run 40647907278) failed on the same test. The `check` job passed. The `e2e` job passed 24 of 25: "the engine stays inside its budget at a 4x slower CPU" (`apps/web/e2e/perf.spec.ts:126`) exceeded Playwright's 30 s test timeout. It takes 9.2 s locally. On the T1 branch it timed out once and passed on rerun, so it sits close to the limit on the GitHub runner. The run before milestone 2 (40492890290 on 9fc28d7) passed both jobs.

## Do first, in order

1. **Restart Claude Code.** Two idleflow versions (0.1.5 and 0.1.7) were active together this session: the 0.1.5 worktree guard refused the 0.1.7 implementers' `.idleflow-run/result.md` on a retry. A restart loads 0.1.7 throughout.
2. **Make CI green.** `/idleflow:fix "the engine budget e2e test exceeds Playwright's 30 s timeout on the GitHub runner"`. Start by finding where the test spends its time on CI. Every engine update now also runs the images pass (`imagesOf` in `apps/web/src/engine-worker.ts`). Raising the test timeout without a reason is not a fix.
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
| The images pass is capped at 50 object–optic pairs and 80 arrows; the cap scene measures 12.8 ms locally against a 40 ms budget. The GitHub runner measured about 2.8 times the local figure (50.4 ms at 100 pairs) | `packages/engine/src/images.ts`, `apps/web/e2e/perf.spec.ts` |
| CI uses the Playwright `github` reporter, which prints annotations only for failing tests, so a passing run shows no timing figures | `playwright.config.ts` |
| Chromium cannot throttle Web Workers, so worker timings in the speed tests are scaled by the rate, not measured slowed | `apps/web/e2e/perf.spec.ts` |
| Image arrows are for extended objects only; point sources and beams show their images through the eye | `prd.md` milestone 2 |
| idleflow issues opened this session: Idle-Sync/idleflow#14 (show debate cuts to the human first) and #15 (CI timing criteria cannot be quoted on a pass) | GitHub |
| Product name: "Light Lab" is a working title | `prd.md` Open questions |

## Where to read

- `progress.md`, `docs/sessions/s_0005.md`: what milestone 2 landed
- `docs/sessions/s_0004.md`: the bounded scene fields and the eye-budget fix
- `progress.md`: milestones 3 to 9; `prd.md`: every "done when"
- `.idleflow/lessons.md`: size timing budgets against the CI reading, not the local one
