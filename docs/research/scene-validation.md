status: decided: valibot

# scene-validation — library options
researched: 2026-10-26   for: Light Lab v1 (versioned scene format)   status: open

## What we need
Validate untrusted scene JSON from a URL fragment, file or browser storage before `trace(scene)` runs, with types derived from the schema. Runs in the engine package (no DOM). Licence must be GPL-3.0 compatible; TypeScript strict.

## Already in the repo
Nothing covers this (no package.json yet). Migrations v1 to v2 and onward are hand-written whichever option is chosen; none of these libraries migrates versions.

## Options
### zod
what: TypeScript-first schema validation with inferred types.
install: `npm install zod`   source: https://zod.dev/ (2026-10-26; page lists no pnpm form)
maintained: yes — v4.6.7 released 2026-10-12, MIT, 108 open issues   source: https://github.com/colinhacks/zod (2026-10-26)
adoption: 221,643,257 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/zod (2026-10-26)
fits: schema doubles as the scene type; `safeParse` returns a typed error list for bad links.
pros: largest ecosystem; types inferred; one schema guards links and the library API
cons: bigger runtime than modular libraries (size not measured here); major version changes in the last 18 months (v3 to v4)
sources:
- https://zod.dev/ — docs — 2026-10-26
- https://github.com/colinhacks/zod — repo — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/zod — independent (registry) — 2026-10-26

### valibot
what: Modular schema validation with inferred types; functions imported one by one.
install: `npm install valibot` (also `pnpm add valibot`)   source: https://valibot.dev/guides/installation/ (2026-10-26)
maintained: yes — v1.5.0 released 2026-09-09, MIT, 231 open issues, last push 2026-10-24   source: https://github.com/fabian-hiller/valibot (2026-10-26)
adoption: 14,436,274 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/valibot (2026-10-26)
fits: same job as zod; modular imports suit a library that may be published and bundled into a PWA.
pros: tree-shakable; MIT; active
cons: about 15 times fewer downloads than zod; smaller ecosystem; different API from zod
sources:
- https://valibot.dev/guides/installation/ — docs — 2026-10-26
- https://github.com/fabian-hiller/valibot — repo — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/valibot — independent (registry) — 2026-10-26

### ajv
what: JSON Schema validator (draft-07 to 2020-12).
install: `npm install ajv`   source: https://github.com/ajv-validator/ajv (README line 140, 2026-10-26)
maintained: yes — v8.20.0 released 2026-04-24, MIT, 394 open issues, last push 2026-09-06   source: https://github.com/ajv-validator/ajv (2026-10-26)
adoption: 249,308,485 npm downloads, week 2026-10-16..22 (mostly as a transitive dependency of tooling)   source: https://api.npmjs.org/downloads/point/last-week/ajv (2026-10-26)
fits: a published JSON Schema file can be shared with non-TypeScript consumers of the engine; TypeScript types are written or generated separately.
pros: standard JSON Schema document, language-neutral; mature
cons: types not inferred from the schema; compiles validators with generated code (CSP and bundle-size consideration); 394 open issues
sources:
- https://github.com/ajv-validator/ajv — repo and README — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/ajv — independent (registry) — 2026-10-26

## Hand-written alternative
A `parseScene(json)` with per-object-kind checks: about 150 to 250 lines for the 9 object kinds plus error messages, and types written by hand beside it. Every new object kind or field needs a matching edit in both places; drift between type and checker is the upkeep cost. Migrations are hand-written in all cases.
