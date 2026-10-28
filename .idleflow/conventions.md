# Conventions for this repo

Read by the planner, every implementer and the conformance reviewer at the start of every
idleflow run. Commit this file. Edit it by hand whenever a decision changes, or run
`/idleflow:style` to re-answer the readability question.

## Code style (always on, every mode)

- **Simplest thing that is correct and robust.** No abstraction, option, or layer that the
  acceptance criteria do not need today. Three similar lines beat a helper used once.
- **Plain names, no jargon.** A reader who knows the language but not the codebase should
  understand a function from its name and its first five lines. `customers_without_orders`
  not `cust_filt`; `retry_after_seconds` not `rsec`. No abbreviations the codebase does not
  already use everywhere.
- **One idea per function.** If a docstring needs "and", split it.
- **Early return over nesting.** Handle the error or edge case first, then the main path flat.
- **Comments say why, not what.** Code that needs a "what" comment gets rewritten instead.
- **Boring over clever.** Standard library before a dependency; a loop before metaprogramming;
  a plain dict before a class, until there is behaviour to attach.
- **Handle failures where they happen.** No bare `except`/`catch`, no swallowed errors, no
  silent fallbacks. If something can be missing, say what happens then.
- **Tests sit next to the code they test.** `store.ts` has `store.test.ts` beside it, as Vitest
  finds them by default; browser tests live in `apps/web/e2e/`.
- **Match the repo.** When this file and the surrounding code disagree, the surrounding code
  wins inside an existing module; this file wins for new modules.

## Writing docs, commits and comments (always on)

- **No meta commentary.** Nothing in this repo narrates how it came to be: no "the user
  asked", "as requested", "per our discussion", "I'll now", "after review". State the fact,
  the decision, or the reason. Applies to every `.md`, commit message, pull request, issue,
  session note, research file and code comment. The conformance reviewer rejects on it.
- **Docs describe the code as it is.** A change that makes a sentence wrong fixes the
  sentence in the same commit. Plans live in `prd.md` and `progress.md` "Next", nowhere else.
- **Attribution and releases** follow the `co_author_claude:` and `releases:` lines in `CLAUDE.md`.

## Readability mode

mode: balanced

Set to one of these by the first `/idleflow:feature` or `/idleflow:init` run (it asks), or by `/idleflow:style`.

| mode | what the implementer does | best for |
|---|---|---|
| `explicit` | Loops, named intermediate values, one step per line. No comprehensions, chained calls, ternaries or one-liners that do two things. | Teams with mixed experience, teaching codebases, anything a non-programmer reviews. |
| `idiomatic` | The language's native idioms wherever they fit: comprehensions, built-ins, chaining, pattern matching. | Experienced teams who read the language fluently and want less code. |
| `balanced` | An idiom only when it reads as one plain sentence (single clause, no nesting, fits on one line); otherwise explicit. | New projects. The default for an empty repo when nobody is there to answer. |
| `repo` | Write code the way the surrounding code is already written. Before writing, read the file being changed and its nearest neighbours (same directory or layer, and their tests) and match their naming, comment style and density, guard and early-return shape, call style and test structure. No pattern, helper or idiom those files do not already use; a new file copies the closest existing file of its kind. Where the neighbours and the code-style rules above disagree on shape, the neighbours win; failure handling still follows the rules. | Existing codebases with an established style. Offered first on any repo that already has code, and its default when nobody is there to answer. |

Whatever the mode: a construct that takes two readings to understand is wrong in every mode.

## Project docs

docs: yes

`yes` means the repo keeps `prd.md`, `progress.md`, `index.md` and a `CLAUDE.md` block at its
root plus a `docs/` folder (`docs/research/` for library and stack research, `docs/sessions/`
for end-of-session notes), the doc-keeper grounds every doc against the code at the start of
each run, and the retro updates them after every run. Set to `yes` automatically for greenfield
runs or when those files already exist. `no` leaves them out.

docs_in_git: yes

`yes` commits `docs/` so everyone shares the research and session notes. `no` keeps `docs/` out
of git through the file `ignore_in:` names, so they stay local to this machine. Asked once, the
first time docs are turned on.

lessons_in: idleflow

Where the lessons file lives. `idleflow` keeps it at `.idleflow/lessons.md`; `docs` keeps it at
`docs/lessons.md`, next to the research and session notes. Either way it is committed and the
whole team reads the same lessons. Unset means `.idleflow/`. Asked once, when docs are on.

## Records

Where this repo keeps the records idleflow reads and writes. The defaults are idleflow's own files;
a repo that already keeps these somewhere points idleflow at them instead of getting a second set.
`run.sh path <name>` resolves each one. Unset or missing lines mean the default.

progress_file: progress.md
index_file: index.md
index_rewrite: yes
sessions_dir: docs/sessions
session_names: time-author
time_log: .idleflow/time-log.md
shared_files: none

- `progress_file`, `index_file`, `sessions_dir`, `time_log`: relative paths inside the repo.
- `index_rewrite`: `yes` lets the retro rewrite the index after a run; `no` leaves it to the
  repo's own process (tasks add their rows through `shared_files`).
- `session_names`: `time-author` (`s_<YYYYMMDD-HHMM>-<author>.md`, safe with several writers),
  `per-person` (`<person>/s_0001.md`: each person numbers their own folder, so nothing collides; the
  folder is the GitHub login, or `git config idleflow.person <name>` to name it), or `numbered`
  (`s_0001.md`, ...; two writers can pick the same number).
- `shared_files`: space-separated paths every task may add its own lines to, such as `CHANGELOG.md`
  or an index the repo's checks require a row in for each new file. No task owns them, they merge by
  union, and a task changes only the lines it adds.

## Talking to the human

language: auto
tone: plain

How idleflow talks to the human (`procedures/talking.md` in the plugin). `language`: `auto` replies
in the language the human writes in, or a language name to always use it; files, commits and code keep
the repo's language. `tone`: `plain` (direct, no filler), `friendly` (plain, warmer), `terse` (fewest
words). Internal ids (T2, R3, C1) are never shown on their own in any tone.

## Repo fit

How idleflow fits a repo that already has its own rules. Unset or missing lines keep idleflow's
defaults. A command here (`worktree_setup`, `gate`) runs only as committed, and only after each
person approved that exact text on their own clone (`run.sh approve <key>`, kept in local git
config); a changed command is asked about again.

worktrees_in: sibling
worktree_setup: corepack pnpm install --frozen-lockfile
commit_format: idleflow
gate: pnpm check
gate_quick: none
gate_runs: every-task
preview: pnpm dev --port 5173 --strictPort
preview_url: http://localhost:5173

- `worktrees_in`: `sibling` puts task worktrees next to the repo (`<repo>__wt/<task>`); `inside` puts
  them in `.idleflow/worktrees/` (ignored), for projects that must not write outside their own folder.
  Tools that scan hidden folders may then see the worktrees.
- `worktree_setup`: one shell command run in every new task worktree before the implementer starts
  (link large shared folders, copy fixtures); `$MAIN` is the main checkout, `$WORKTREE` the new one.
  A failure, or a change to a tracked file, stops the worktree.
- `gate`: the one command that says whether the repo is healthy (its own check script, `make check`,
  `npm test`). Set, it is the definition of done: run on the base before building, by each implementer
  after its last change, by the correctness reviewer, and after the merge.
- `gate_runs`: `every-task` runs the gate on the base, for each task and after the merge; `once` (for a
  gate slower than `SLOW_GATE_SECONDS`) runs `gate_quick` for each task and the full gate once after the
  merge, checking the base only if that fails. `gate_quick` follows the same approval rule as `gate`.
- `preview` and `preview_url`: the command that serves the app from a checkout (`npm run dev -- --port 4173`)
  and the address it serves, which must be on this machine (`http://localhost:<port>`). The design
  reviewer starts it in a task's worktree only through `run.sh preview`, to take screenshots at phone and
  desktop widths when a browser tool is available. Same approval rule as `gate`.
- `commit_format`: `idleflow` (task commits `T1: ...`, merges `idleflow: merge T1 (<run>)`) or
  `conventional` (Conventional Commits subjects of at most 72 characters for task, finish and merge
  commits, run and task ids in the body), for repos whose CI checks commit subjects.

## Ignore rules

ignore_in: exclude

Where idleflow writes its own ignore rules (`.idleflow/runs/`, a local `docs/`). `exclude` uses
`.git/info/exclude`: local to this clone, so nothing about idleflow appears in a committed file.
`gitignore` uses `.gitignore`: shared with every clone and visible to everyone who reads the repo.
Until it is answered, rules go to `.git/info/exclude`. A stack's own entries (`node_modules/`,
`.venv/`, `dist/`, `.env`) always go in `.gitignore`, because every clone needs them.

## Pushback

Agents question a decision when the evidence says it is wrong: the conflict in one sentence,
the evidence with its path or URL, a better option with its cost. Once, then the human's call
stands and the reason is recorded. No pushback without evidence; no agreement without checking.

## Tooling

Skills, plugins and workflows accepted from the tooling advisor, one line each, with the job
they cover. Full detail in `docs/research/tooling.md`. Missing skills are requested with
`/idleflow:skills-feedback`, idleflow problems reported with `/idleflow:plugin-feedback`.

<!-- tooling start -->
- playwright (plugin): browser tests of touch drag and pinch on phone viewports, scene-link round trips, PWA offline reload, keyboard operation
- chrome-devtools-mcp (plugin): performance budget under CPU throttling, worker trace timing, offline PWA network and console checks
- a11y-enforcer-wcag-accessibility-checker (plugin): WCAG AA checks of contrast, labels, focus order and keyboard traps in the React UI
- vercel (plugin): deploys and preview URLs per milestone


## Stack decisions

Accepted proposals from the stack advisor and libraries chosen from the library scout's
research, one line each. The planner treats these as constraints; implementers may not
introduce a tool or a hand-written replacement that contradicts them. Declined items are
listed too so they are not proposed again.

<!-- stack decisions start -->
- [P1] pnpm workspace with a pinned package manager: engine package and web app as workspace members; pnpm pinned through `devEngines.packageManager` to a current major  (why: one lockfile and the same package manager everywhere; evidence: https://pnpm.io/package_json)
- [P2] Pin the Node version: Node 24 line in `.node-version` and `engines`  (why: local, CI and Vercel run the same Node; vitest needs 22.12+; evidence: https://raw.githubusercontent.com/nodejs/Release/main/README.md)
- [P3] Quality tooling for TypeScript: biome for format and lint, `tsc --strict --noEmit`, vitest  (why: one config, strict types and tests from the first file; evidence: https://vitest.dev/guide/)
- [P3] declined: husky + lint-staged pre-commit hook (CI runs the same checks on every push)
- [P4] Offline support with vite-plugin-pwa: `VitePWA({ registerType: 'autoUpdate' })` for manifest and Workbox service worker  (why: no hand-written service worker; evidence: https://vite-pwa-org.netlify.app/guide/)
- [P5] GitHub Actions CI: one workflow on push and pull request running biome, `tsc --noEmit` and `vitest run` with the pinned Node and pnpm  (why: checks run on every change; evidence: https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-nodejs)
- [P6] Web Worker tracing: Vite `new Worker(new URL('./worker.ts', import.meta.url))` exposing the engine through Comlink  (why: typed async calls, no hand-written message protocol; evidence: https://vite.dev/guide/features#web-workers)
- [P7] Named commands as package.json scripts (`dev`, `test`, `check`), no justfile  (why: no extra binary for contributors or CI; evidence: https://just.systems/man/en/packages.html)
- [L1] scene validation: valibot (modular and tree-shakable schema with inferred types for the versioned scene JSON; migrations hand-written; research: docs/research/scene-validation.md)
- [L2] spatial index for ray hits: hand-written (grid or box tree with a ray walk, about 80 to 150 lines; the ray walk is hand-written with any library; research: docs/research/spatial-index.md)
- [L3] undo, redo and scene state: hand-written (snapshot stack, about 30 to 50 lines; a scene is under 1 KB of JSON; research: docs/research/undo-redo-state.md)
- [L4] pan, zoom and touch gestures: hand-written (Pointer Events plus transform maths, about 60 to 100 lines; every library option is unmaintained; research: docs/research/pan-zoom-gestures.md)
- [L5] GPU wave grid for the ripple view: p5 WEBGL framebuffers (p5 is already decided, no new dependency; research: docs/research/gpu-wave-grid.md)
