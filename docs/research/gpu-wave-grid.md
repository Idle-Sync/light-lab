status: decided: p5 WEBGL framebuffers

# gpu-wave-grid — library options
researched: 2026-10-26   for: Light Lab v1 (ripple view, GPU FDTD wave grid; visual, not for measurement)   status: open

## What we need
Run a 2D wave-equation grid in fragment shaders with float or half-float textures and ping-pong framebuffers, then show it on the canvas. Browser, desktop and mobile. p5 is already decided for the canvas, so the grid should coexist with it.

## Already in the repo
p5 (decided in `docs/vision.md`; not yet in a lockfile). Its WEBGL mode has `createFramebuffer()`; the reference page says the `format` option accepts `UNSIGNED_BYTE`, `FLOAT` or `HALF_FLOAT` and that framebuffers "can be used as textures in WebGL mode" (https://p5js.org/reference/p5/createFramebuffer/, 2026-10-26). The page does not mention custom shaders or ping-pong; that combination is not verified here.
Licence note: npm lists p5 as LGPL-2.1; the FSF licence list says LGPL 2.1 "is compatible with GPLv2 and GPLv3" (https://www.gnu.org/licenses/license-list.html, 2026-10-26).
maintained: yes — p5 v2.3.4 released 2026-09-25, last push 2026-10-26   source: https://github.com/processing/p5.js

## Options
### p5 WEBGL mode (already decided)
what: Framebuffers and shaders inside the existing p5 instance.
install: no install command verified   (p5 is part of the decided stack)
adoption: 67,733 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/p5 (2026-10-26)
fits: no second WebGL context; the ripple canvas and the ray canvas share one library.
pros: nothing new to add; float framebuffers documented
cons: a WEBGL-mode p5 instance is a separate canvas from the 2D ray canvas; ping-pong shader loop unverified in the docs; p5 2.x changed APIs from 1.x
sources:
- https://p5js.org/reference/p5/createFramebuffer/ — docs — 2026-10-26
- https://github.com/processing/p5.js — repo — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/p5 — independent (registry) — 2026-10-26

### twgl.js
what: Thin helper over raw WebGL: programs, buffers, uniforms, textures, framebuffers.
install: `npm install twgl.js` (also `npm install twgl-base.js`)   source: https://github.com/greggman/twgl.js README lines 523, 529 (2026-10-26)
maintained: yes — v7.0.0 released 2025-07-16, MIT, 54 open issues, last push 2026-10-19   source: https://github.com/greggman/twgl.js
adoption: 23,665 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/twgl.js (2026-10-26)
fits: framebuffer helpers match ping-pong grids; keeps raw WebGL control.
pros: small; close to the WebGL API; MIT
cons: small user base; you write the simulation loop and shaders; own WebGL context separate from p5
sources:
- https://github.com/greggman/twgl.js — repo and README — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/twgl.js — independent (registry) — 2026-10-26
- https://best-of-web.builder.io/library/greggman/twgl.js — independent (aggregator; says twgl suits custom pipelines) — fetched via search 2026-10-26

### regl
what: Functional, stateless WebGL wrapper using declarative draw commands.
install: `npm i -S regl`   source: https://github.com/regl-project/regl README line 131 (2026-10-26)
maintained: yes, with a caveat — v2.1.1 released 2024-11-12 (older than 12 months), last push 2026-10-17, MIT, 127 open issues   source: https://github.com/regl-project/regl
adoption: 593,478 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/regl (2026-10-26)
fits: render-to-framebuffer commands cover ping-pong; fewer lines than raw WebGL.
pros: less boilerplate; no dependencies per aggregator
cons: declarative model is a different style; some overhead for simple jobs per aggregator; 127 open issues; own WebGL context
sources:
- https://github.com/regl-project/regl — repo and README — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/regl — independent (registry) — 2026-10-26
- https://best-of-web.builder.io/library/regl-project/regl — independent (aggregator) — fetched via search 2026-10-26

## Hand-written alternative
Raw WebGL2: about 150 to 250 lines for context, shader compile, two float textures with framebuffers, a step pass and a display pass, plus the wave-equation fragment shader (about 20 lines) and absorbing edges. The twgl README notes a basic raw shader setup is roughly 30 lines plus a lookup per uniform. Upkeep: float-texture extension support differs on mobile (`EXT_color_buffer_float` / half-float), which every option still has to handle.
