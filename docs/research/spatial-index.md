status: decided: hand-written

# spatial-index — library options
researched: 2026-10-26   for: Light Lab v1 (fast ray hits with many ray segments)   status: open

## What we need
Cut the ray-vs-surface test from every-surface to a few candidates. Objects are line segments and arcs (bounding boxes) that change when the user edits and are fixed during a trace. Runs in a worker inside the engine; no DOM. GPL-3.0 compatible licences only.

## Already in the repo
Nothing covers this. The prototype tests each ray against every primitive (`reference/engine-geometry/geometry.js`, `hit`).

## Options
### flatbush
what: Static packed Hilbert R-tree for 2D rectangles, stored in one ArrayBuffer.
install: `npm install flatbush`   source: https://github.com/mourner/flatbush README (2026-10-26)
maintained: yes — v4.6.2 released 2026-06-09, ISC, 7 open issues, last push 2026-10-16   source: https://github.com/mourner/flatbush (2026-10-26)
adoption: 231,997 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/flatbush (2026-10-26)
fits: rebuild after each scene edit (static), query many times during a trace; the buffer transfers to a worker without copying. Queries are by rectangle, so a ray needs a hand-written walk or a box per ray segment.
pros: fast build and query; transferable buffer; ISC
cons: no add or remove, so a rebuild per edit; no ray query built in; smaller user base than rbush
sources:
- https://github.com/mourner/flatbush — repo and README — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/flatbush — independent (registry) — 2026-10-26
- https://www.npmjs.com/package/flatbush — independent summary, fetched via search 2026-10-26 (README benchmark: about 263 ms vs 1208 ms to index 1,000,000 rectangles, maintainer's numbers on Node v10.11.0)

### rbush
what: Dynamic R-tree for 2D points and rectangles with insert, remove and bulk load.
install: `npm install rbush`   source: https://github.com/mourner/rbush README (2026-10-26)
maintained: yes — v4.0.1 released 2024-08-21 (older than 12 months), MIT, 13 open issues, last push 2026-10-02   source: https://github.com/mourner/rbush (2026-10-26)
adoption: 4,623,447 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/rbush (2026-10-26)
fits: dragging an object updates one entry instead of rebuilding; same rectangle-query limit as flatbush.
pros: incremental updates; widely used; MIT
cons: objects not in a transferable buffer; slower than flatbush per its maintainer's benchmark; no ray query
sources:
- https://github.com/mourner/rbush — repo and README — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/rbush — independent (registry) — 2026-10-26
- https://www.libelektra.org/ftp/permaplant/doc/mr/mdbook/decisions/implemented/frontend_spatial_indexing.html — independent (project decision record choosing RBush for editable data) — undated

## Hand-written alternative
A uniform grid or a bounding-box BVH with a ray walk: about 80 to 150 lines plus tests, built against the oracles in `reference/checks/verify.mjs`. Ray traversal (slab test on boxes) is needed with either library anyway, so the hand-written part is the traversal; the library only replaces the tree build. Scenes with tens of primitives may not need an index; a profile under CPU throttling would show.
