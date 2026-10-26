inventory: 11 plugins installed, 1 Idle-Sync skills installed of 2 in the catalogue
install_method_idlesync: `npx skills add Idle-Sync/skills/<skill-name> --global`   source: https://github.com/Idle-Sync/skills (README)

## Already have
- context7 — library docs lookup (vite, p5, valibot, vite-plugin-pwa, Comlink)
- typescript-lsp — TypeScript navigation and diagnostics
- frontend-design — React, Tailwind and shadcn/ui interface work
- commit-commands, pr-review-toolkit, security-guidance, superpowers — commits, PR review, security checks
- context-check (Idle-Sync skill) — real context usage
- /idleflow:feature, /idleflow:fix, /idleflow:style, /simplify, /security-review — feature, fix and review workflows

## Proposals
### T1. playwright   kind: plugin
job: browser tests of the bench: touch drag and pinch on phone-sized viewports, scene-link round trips, PWA offline reload, keyboard operation.
why_this_one: runs Chromium, WebKit and Firefox with device emulation and touch; chrome-devtools-mcp (T2) covers profiling, not cross-browser tests.
install: `claude plugin install playwright@claude-plugins-official`
cost: browser binaries download on first use; each page snapshot adds tokens; launches local browsers.
con: end-to-end tests are slower than vitest and are flaky on canvas content, so assertions must read DOM readouts, not pixels.
default: accept

### T2. chrome-devtools-mcp   kind: plugin
job: the performance budget under CPU throttling, worker trace timing, network and console checks of the offline PWA.
why_this_one: records performance traces with CPU throttling; playwright (T1) does not expose traces as a first-class tool.
install: `claude plugin install chrome-devtools-mcp@claude-plugins-official`
cost: trace output is large; drives a local Chrome instance.
con: overlaps with T1 for page automation; two browser tools to keep working.
default: accept

### T3. a11y-enforcer-wcag-accessibility-checker   kind: plugin
job: WCAG AA is a hard constraint: contrast, labels, focus order and keyboard traps in the React UI, checked on each UI change.
why_this_one: finds WCAG 2.2 problems in React source directly; no accessibility plugin exists in claude-plugins-official, and playwright only checks what a test asserts.
install: `claude plugin install a11y-enforcer-wcag-accessibility-checker@anthropic-plugin-directory`
cost: reads source files per run; no extra permissions listed.
con: third-party plugin in the directory, not vetted here; static analysis cannot judge the p5 canvas, which needs a text alternative by hand.
default: accept

### T4. code-simplifier   kind: plugin
job: pass over recently modified engine and UI code after each checkpoint to keep the "simplest correct thing" convention.
why_this_one: runs as an agent on recent changes; the built-in /simplify does the same job, so this one adds a dedicated agent but little else.
install: `claude plugin install code-simplifier@claude-plugins-official`
cost: one agent run of tokens per use.
con: duplicates /simplify; skip it if /simplify is enough.
default: decline

### T5. vercel (finish install)   kind: plugin
job: deploys and preview URLs on Vercel for each milestone.
why_this_one: already enabled; `claude plugin list` reports its packages are not installed.
install: `claude plugin update vercel@claude-plugins-official`
cost: downloads the plugin packages; the deploy permissions are the Vercel account's.
con: deploys act on a real Vercel account; a static Vite site needs only `vercel` CLI or the Git integration.
default: accept

## Skills that do not exist yet
- Optics oracle check — runs reference/checks/verify.mjs, reports each oracle against its docs/vision.md value and flags drift — request with: /idleflow:skills-feedback "optics oracle check: run the physics oracles and report each result against the documented value"
- Scene-link migration fixtures — adds a sample link for every new scene version and checks that all old links still open — request with: /idleflow:skills-feedback "scene-link migration fixtures: add a sample versioned link per format change and verify every old link migrates"
