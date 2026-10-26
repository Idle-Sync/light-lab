status: decided: hand-written

# pan-zoom-gestures — library options
researched: 2026-10-26   for: Light Lab v1 (touch and mouse pan, zoom, pinch)   status: open

## What we need
Pan, wheel zoom and two-finger pinch on the bench canvas, on desktop and phone/tablet, cursor-centred zoom, not retracing rays (pan and zoom redraw cached segments). The canvas is p5 in instance mode inside a React component.

## Already in the repo
Nothing covers this. p5 provides pointer input; the browser provides Pointer Events natively.

## Options
### @use-gesture/vanilla (and /react)
what: Gesture recogniser for drag, pinch, wheel and scroll, with React hooks and a vanilla version.
install: `npm install @use-gesture/react` or `npm install @use-gesture/vanilla`   source: https://github.com/pmndrs/use-gesture README (2026-10-26)
maintained: yes, with a caveat — v10.3.1 released 2024-03-21, last push 2024-07-15 (both older than 12 months), MIT, 57 open issues   source: https://github.com/pmndrs/use-gesture (2026-10-26)
adoption: @use-gesture/react 4,662,164 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/@use-gesture/react (2026-10-26)
fits: pinch and drag as events with deltas and origin; the vanilla build attaches to the canvas element without React.
pros: handles drag, pinch and wheel in one API; vanilla and React builds; MIT
cons: no commit or release in over two years (fails the 12-month test); pinch origin and transform maths still written by hand
sources:
- https://github.com/pmndrs/use-gesture — repo and README — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/@use-gesture/react — independent (registry) — 2026-10-26

### d3-zoom
what: Pan and zoom behaviour with wheel, drag and touch pinch, maintaining a transform (x, y, k).
install: no install command verified   (page https://d3js.org/d3-zoom shows none; npm package name `d3-zoom` per the registry)
maintained: no — v3.0.0 released 2021-06-10, last push 2024-04-30, ISC, 24 open issues   source: https://github.com/d3/d3-zoom (2026-10-26)
adoption: 22,419,534 npm downloads, week 2026-10-16..22 (as a d3 dependency)   source: https://api.npmjs.org/downloads/point/last-week/d3-zoom (2026-10-26)
fits: its docs say "click-and-drag to pan (translate), spin the wheel to zoom (scale), or pinch with touch"; the transform maps screen to bench coordinates. Requires d3-selection and a DOM element.
pros: produces a ready transform with cursor-centred zoom; tested on touch; ISC
cons: needs d3-selection; stale (no release since 2021); default touch detection misses some emulators
sources:
- https://d3js.org/d3-zoom — docs — 2026-10-26
- https://github.com/d3/d3-zoom — repo — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/d3-zoom — independent (registry) — 2026-10-26

### hammerjs
what: Touch gesture library (pan, pinch, rotate, tap).
install: no install command verified
maintained: no — v2.0.8 released 2016-04-22; repo push 2026-01-04, MIT, 317 open issues   source: https://github.com/hammerjs/hammer.js (2026-10-26)
adoption: 1,082,553 npm downloads, week 2026-10-16..22   source: https://api.npmjs.org/downloads/point/last-week/hammerjs (2026-10-26)
fits: pinch and pan on touch.
pros: small and well known
cons: no release in about ten years; 317 open issues; predates Pointer Events
sources:
- https://github.com/hammerjs/hammer.js — repo — 2026-10-26
- https://api.npmjs.org/downloads/point/last-week/hammerjs — independent (registry) — 2026-10-26

## Hand-written alternative
Pointer Events (`pointerdown/move/up`, `setPointerCapture`) with a map of active pointers: one pointer pans, two pointers give scale from the distance ratio and pan from the midpoint; wheel zoom around the cursor. About 60 to 100 lines plus tests for the transform maths; touch-action CSS and browser quirks (Safari gesture events, trackpad pinch arrives as wheel with ctrlKey) are the upkeep. The transform maths is needed with any option.
