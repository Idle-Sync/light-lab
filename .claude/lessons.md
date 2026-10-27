# Lessons for this repo

One line per lesson, written by the idleflow retro agent, read by the planner at the start of every run.
Prune monthly: delete anything that stopped being true, merge near-duplicates. Keep under 40 lines —
past that the planner skims and the file stops working.

Format: `- [<run-id>] <lesson>  (seen Nx)`

<!-- lessons start -->
- [20261026-163917-milestone-1-ray-bench] Browser boundary calls (localStorage, navigator.clipboard, async writers, out-of-order async results) each need a test for the throwing, missing and late case; the M1 integration review found four such gaps in T5 (storage DOMException, missing clipboard API, stale async link decodes, a broken link hiding the saved scene). Write these failure cases into the acceptance criteria of any task that touches those APIs.  (seen 1x)
- [20261027-122603-bound-scene-fields-eye-budget] A timed budget that passed under local 4x throttling failed on the GitHub runner (magnifier eye pass 201.6 ms in CI against a 100 ms budget; it had passed locally). Any task that changes the eye or wave pass or a responsiveness budget must run `apps/web/e2e/perf.spec.ts` in CI before merge, and its acceptance criteria must name that run.  (seen 1x)
