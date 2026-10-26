# Lessons for this repo

One line per lesson, written by the idleflow retro agent, read by the planner at the start of every run.
Prune monthly: delete anything that stopped being true, merge near-duplicates. Keep under 40 lines —
past that the planner skims and the file stops working.

Format: `- [<run-id>] <lesson>  (seen Nx)`

<!-- lessons start -->
- [20261026-163917-milestone-1-ray-bench] Browser boundary calls (localStorage, navigator.clipboard, async writers, out-of-order async results) each need a test for the throwing, missing and late case; the M1 integration review found four such gaps in T5 (storage DOMException, missing clipboard API, stale async link decodes, a broken link hiding the saved scene). Write these failure cases into the acceptance criteria of any task that touches those APIs.  (seen 1x)
