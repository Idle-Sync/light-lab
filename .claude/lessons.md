# Lessons for this repo

One line per lesson, written by the idleflow retro agent, read by the planner at the start of every run.
Prune monthly: delete anything that stopped being true, merge near-duplicates. Keep under 40 lines —
past that the planner skims and the file stops working.

Format: `- [<run-id>] <lesson>  (seen Nx)`

<!-- lessons start -->
- [20261026-163917-milestone-1-ray-bench] Browser boundary calls (localStorage, navigator.clipboard, async writers, out-of-order async results) each need a test for the throwing, missing and late case; the M1 integration review found four such gaps in T5 (storage DOMException, missing clipboard API, stale async link decodes, a broken link hiding the saved scene). Write these failure cases into the acceptance criteria of any task that touches those APIs.  (seen 1x)
- [20261027-163103-milestone-2-beginner-bench-rest] A timed budget that passed under local 4x throttling failed on the GitHub runner: the magnifier eye pass measured 201.6 ms in CI against a 100 ms budget (16 ms locally), and the images pass measured 50.4 ms against 40 ms (18.0 ms locally, about 2.8×). Any task that changes a timed budget or the pass it measures must run `apps/web/e2e/perf.spec.ts` in CI before merge, its acceptance criteria must name that run, and its plan sizes caps against the CI reading, not the local one (the CI factor was about 2.8× for the images pass and about 12× for the eye pass).  (seen 2x)
