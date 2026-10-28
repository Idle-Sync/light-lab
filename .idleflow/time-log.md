# Time log

How long each idleflow task took against its estimate, and why, one row per task, appended by the
retro after each run. The planner reads the latest rows to estimate the next plan from this repo's
own history. Times come from `run.json` (task start to report, epoch seconds); tokens only when the
harness reported them, otherwise `unknown`. Rows are not rewritten afterwards.

| Date | Run | Task | Model | Lines est / actual | Minutes est / actual | Tokens | Why they differ |
|---|---|---|---|---|---|---|---|
| 2026-10-28 | 20261028-142214-perf-tests-ci-flaky | T1 | opus | 45 / 104 | 75 / 23 | 75040 | 104 lines in 2 files against 45 planned: six printed reading lines and the handoff update; 0 retries, no blocked files, one mutation survived and is declared in the report |
| 2026-10-28 | 20261028-155412-perf-beforeall-page-gate | T1 | sonnet | 60 / 77 | 30 / 8 | 40728 | 77 lines in 3 files against 60 planned: the new console-gate spec (35 lines) and the shared listener helper; 0 retries, one CI attempt, review approved with no findings |
