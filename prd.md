# Light Lab — product requirements

Humans own this file: edit it freely. The planner reads it at the start of every run and
treats it as the source of truth for scope. "Light Lab" is a working title (see Open questions).

## Why this exists

Students, teachers, hobbyists and optical engineers who want to build intuition about light
today use tools that each do half the job: Ray Optics Simulation traces rays but not
interference and waits for a full retrace on every pan or zoom; Falstad's ripple tank and
PhET's Wave Interference show waves without measured values in real units; none of them puts
an observer eye in the scene (`docs/market-research.md`, "The gap"). Light Lab is a browser
2D optics sandbox where sources, mirrors, lenses, prisms, slits and an eye are dragged onto a
dark bench, light is traced live, and every number shown (focal length, fringe spacing, how
much light a path keeps) is computed from physics and checkable against a datasheet or a
textbook. The market is crowded, so the product commits to the wedge the research names:
rays plus measured wave diffraction plus eye analysis in one scene, with responsiveness under
pan, zoom and many rays, and readouts that state their assumptions (`docs/market-research.md`,
"Verdict"). The eye feature is a hypothesis; milestone 1 exists to test it with real users.

## Users

- Students and teachers — drag optics onto a bench, see rays and readouts update live, share a
  scene as a link for a lesson or homework, on a laptop or a phone.
- The public and optics hobbyists — play to build intuition; check a number against a textbook.
- Optics engineers — set up a lens, prism or grating with datasheet glass and read focal
  length, spot size, power and fringe positions in millimetres and nanometres.
- The author — use it daily in place of phydemo; keep the physics oracles green.

## Must do (v1)

Engine and scene format

- Engine as a standalone TypeScript package: pure functions over plain data (`trace(scene)`,
  `analyzeEye(scene, eyeId)`, `computeWaves(setup)`, `migrateScene(json)`), no DOM, canvas or
  p5 import — done when: `pnpm -r check` passes; the engine package has no import from the
  web app, `p5`, `document` or `window`; the engine tests run in Node and import it directly.
- Accuracy oracles in CI — done when: a vitest file reproduces every check in
  `reference/checks/verify.mjs` with the same expected values and tolerances (N-BK7 nd and
  Abbe number, thick-lens paraxial image, ball transmission and real image, magnifier virtual
  image and pupil share, single and double slit sum vs Fraunhofer, single-slit first minimum)
  and CI fails when any of them fails.
- Versioned scene JSON with link encodings — done when: every scene carries `"v"`; the site
  writes `#z.` (deflate-raw then base64url) and reads `#z.` and `#j.` (plain base64url);
  `migrateScene` carries every older version forward and tests keep a sample link from every
  version that ever shipped; the 9-object bench example is under 500 characters as a `#z.`
  link; a bad link shows a plain error and leaves the current scene untouched.
- Save and load as a file, and browser storage keeps the last scene — done when: a reload
  reopens the scene that was on screen; export then import of a file gives an identical scene.

Ray bench (milestone 1)

- Twelve object kinds, each placed from the toolbar, dragged, rotated and edited in the
  inspector: point source, beam, extended object, flat mirror, arc mirror, lens, prism, glass
  ball, blocker, detector, ruler, eye — done when: each kind appears on the bench and takes
  part in the trace or the measurement; `docs/vision.md` "Ray mode" is the model for each.
  Glass objects may not overlap: inside or outside is decided by surface normals, so the
  editor warns on overlap and the trace does not define the result.
- Ray physics: exact hits on segments and arcs, Snell's law with total internal reflection,
  Fresnel partial reflection as the unpolarized average with an s / p / unpolarized switch and
  a global off switch, Sellmeier dispersion for N-BK7, SF11 and fused silica, white light as 7
  wavelengths from 400 to 670 nm, a ray stopping below 0.2 % intensity or after 40
  interactions, hits closer than 1e-6 mm ignored — done when: the ray oracles pass and a test
  shows p-polarized reflectance at Brewster's angle is zero while unpolarized is not.
- Readouts beside objects that state their assumptions and show the theory value next to the
  measured one: lens label with the sign convention in words ("converging, f = +50 mm"),
  detector power and irradiance profile, spot width — done when: every readout has a visible
  "assumes" line; the same scene traced with 11 and with 101 drawn rays reports detector power
  within 1 %; power is normalized per object so an extended object never exceeds 100 %.
- 2D brightness shown as it is, with a "3D equivalent" toggle — done when: moving a detector
  to twice the distance halves its reading in 2D and quarters it with the toggle on.
- Responsiveness: retrace only on scene change; pan and zoom redraw cached segments; the trace
  runs in a Web Worker; a spatial index cuts ray hit tests — done when: a Chrome performance
  trace at 4x CPU throttling shows no retrace during pan or zoom and pan and zoom frames stay
  under 16 ms; at the same throttling the bench example traces in under 20 ms, the same scene
  with 600 drawn rays in under 60 ms, and the ball and magnifier eye analyses in under 100 ms
  (the prototype does these in 0.9 ms, 6.6 ms and 12 ms unthrottled in Node); the eye pass
  runs in the worker and never blocks the page; Chromium throttles only the page thread, so
  worker timings are scaled by the throttling rate; the check is a repeatable test, not a
  one-off measurement.
- Eye path analysis with fixed exposure: dense emission per source, rays grouped by source,
  point, wavelength and surface path, least-squares image point per group classed as real,
  virtual, at infinity or behind the eye; inspector shows the path in words, the share of
  light each path keeps, the share of the source entering the pupil, and the image position;
  virtual images drawn dashed; the eye strip uses a fixed exposure — done when: the ball and
  magnifier oracles pass; a point source keeps its drawn size at any distance and only gets
  brighter as the eye approaches; an extended object's apparent size equals `2·atan(h / 2d)`
  in a test.
- Undo and redo as a snapshot stack — done when: every edit, including drag and inspector
  change, undoes and redoes with keyboard shortcuts and buttons.
- Touch on phone and tablet: one-finger drag of objects, pinch zoom, two-finger pan — done
  when: a Playwright test on a phone-sized viewport with touch drags an object and pinches.
- Accessible to WCAG AA: every toolbar and inspector action reachable by keyboard, visible
  focus, labels and contrast on the look tokens, a text description of the bench for assistive
  technology — done when: the accessibility checker reports no AA failure and a Playwright test
  places and edits an object with the keyboard alone.
- Example scenes in the header (bench, ball, magnifier at least), each a scene link — done
  when: each example opens from the header and from its link.
- Look: black canvas, the look tokens and type from `docs/vision.md` "Look and feel", floating
  toolbar left and inspector right, zoom group and scale bar bottom left, status pill with ray
  count and trace time, sentence case throughout — done when: tokens live in one Tailwind
  config and the two prototype screens in `reference/ui-mockup/` are matched in layout.
- Public repository under the Idle-Sync GitHub organization with a GPL-3.0 `LICENSE`, CI on
  every push, and a Vercel deployment — done when: the production URL opens the bench; CI is
  green on the default branch; a preview URL exists per pull request.

Wave lab (milestone 2)

- Single slit, double slit and grating with wavelength, slit width, separation, slit count and
  screen distance; exact Huygens–Fresnel sum with `1/√r` amplitude and `(1 + cos θ)/2`
  obliquity; Fraunhofer curve dashed over it; fringe positions measured from the sum by a
  windowed extremum refined with a parabola; panel shows measured, Fraunhofer, `d sin θ = λ`
  (or `a sin θ = λ`), small-angle `λL/d`, and the Fresnel number with a regime warning; the
  panel explains the 0.9 % inward pull of double-slit fringes by the single-slit envelope —
  done when: the three wave oracles pass; the warning appears when the Fresnel number reaches 1.
- Wave sum never blocks the interface: it runs in the worker and the panel shows a pending
  state while a result is outstanding — done when: at 4x CPU throttling the default 6-slit
  grating updates in under 25 ms and a 100-slit grating at full screen width finishes within
  2 s with the controls still responsive (the prototype sums these in 5.8 ms and 393 ms
  unthrottled in Node).
- Rays / Waves switch in the header; the wave setup lives in the same versioned scene JSON —
  done when: a wave link opens the wave lab with its settings.

Physical eye, camera projections, offline (milestone 3)

- Camera view on a flat virtual sensor with a projection switch: rectilinear (`f·tan θ`,
  default), equidistant (`f·θ`), stereographic (`2f·tan(θ/2)`) — done when: a straight edge
  of an extended object is straight in rectilinear and curved in equidistant.
- Physical model eye: cornea, lens and curved retina from a standard model eye (Emsley reduced
  eye or Le Grand) traced as optics in the scene, with accommodation, blur, near point and
  depth of field from the physics; retina strip shown unrolled beside the rectilinear view —
  done when: the model eye's focal length is about 16.7 mm (60 dioptres) in a test and a point
  source's retinal spot keeps its size as distance changes.
- Offline PWA with `vite-plugin-pwa` — done when: a Playwright test loads the site, goes
  offline, reloads, and the last scene opens; the app is installable from the browser.

GRIN glass and ray-mode grating (milestone 4)

- Gradient-index glass with an RK4 ray solver and Fresnel reflections at its boundary — done
  when: a GRIN object with a constant index matches homogeneous glass within 1e-6 mm; a
  parabolic profile follows its analytic sinusoidal path within tolerance; the boundary
  reflection carries the Fresnel share.
- Ray-mode diffraction grating whose order directions satisfy `d sin θ = mλ` and whose order
  intensities come from the wave theory of the same grating — done when: order shares agree
  with the wave lab's Fraunhofer values for the same grating within 1 %.

Ripple view (milestone 5)

- GPU wave grid on p5 WEBGL framebuffers showing waves spreading from the wave lab setup, with
  enlarged wavelengths and a visible "for watching, not measuring" note — done when: it runs
  at 30 fps on a phone and the note is on screen.

## Nice to have (later)

- Command palette, alignment guides, editable endpoints — editor comfort, not the core job;
  after milestone 1 feedback. Grid snapping already ships (scene settings, `grid.snap`).
- Fresnel lens and protractor objects — not in the prototype; added once the twelve kinds ship.
- Engine published to npm — the package is built publishable in v1; publishing is a release
  step after the API has carried two milestones unchanged.
- Classroom or lesson mode — needs user evidence from shared links first.
- Embeddable scenes — follows from the URL-only state rule below; a view-only flag is one field.
- Accounts or a paid tier — no demonstrated paid demand (`docs/market-research.md`, "Risks");
  storage sits behind one save/load interface so a backend can slot in.
- Server-stored short links — layered on top of `#` links, which keep working.
- Rust/WASM for a hot function — only when a profiler shows it is the bottleneck.

## Will not do

- 3D view — 2D only is a product decision.
- Backend, accounts, integrations — scenes live in the link and the browser.
- Ray Optics Simulation's name, logo or look — ideas and Apache-2.0 code with its notice only.
- Code from Falstad or PhET — no cleared licence; ideas only.
- Translations — table stakes for PhET and Ray Optics (`docs/market-research.md`, "What users
  praise") but every string would have to be stable first; after v1.
- SVG export — praised in Ray Optics; waits until the renderer settles after the ripple view.
- A pre-commit hook or a justfile — CI runs the same checks; declined in `.claude/conventions.md`.

## Constraints

- Stack (`.claude/conventions.md`, "Stack decisions"): pnpm workspace with engine package and
  web app, pnpm pinned by `devEngines.packageManager` [P1]; Node 24 in `.node-version` and
  `engines` [P2]; biome, `tsc --strict --noEmit`, vitest [P3]; `vite-plugin-pwa` with
  `autoUpdate` [P4]; one GitHub Actions workflow running biome, tsc and vitest [P5]; worker via
  `new Worker(new URL(...))` exposed through Comlink [P6]; `dev`, `test`, `check` as
  package.json scripts [P7]; valibot for scene validation, migrations hand-written [L1];
  hand-written spatial index [L2], undo/redo snapshot stack [L3], Pointer Events pan, zoom and
  touch [L4]; p5 WEBGL framebuffers for the ripple view [L5].
- Interface: Vite + TypeScript + React + Tailwind + shadcn/ui; p5 in instance mode inside one
  React component. The engine imports nothing from the interface or the renderer.
- Style: readability mode `balanced`; plain names; no meta commentary in any file.
- Units: millimetres for length, nanometres for wavelength, 64-bit floats.
- Physics source: `reference/` is the prototype code to port; where its split `.js` files and
  the `.dc.html` screens disagree, the `.dc.html` files win.
- Licence and hosting: public repository under Idle-Sync, GPL-3.0; derivative projects of the
  engine must be GPL-compatible open source; hosted on Vercel; no server, no data leaves the
  browser.
- Accessibility: WCAG AA, checked on every interface change.
- Tooling: playwright, chrome-devtools-mcp, a11y-enforcer-wcag-accessibility-checker and the
  vercel plugin, each for the job named in `.claude/conventions.md` "Tooling".
- Competitor complaints the product answers (`docs/market-research.md`, "What users complain
  about") are each a Must do item above: Ray Optics #374, #113, #370, #149, #50, #69, #121;
  PhET Bending Light #433 and its single-polarization intensity; Falstad's missing touch;
  3DOptix's limited offline use.

## Milestones

Milestones are a build order, not dates; each ends deployed and usable.

1. Ray bench — the workspace, engine package and web app on the new stack with all twelve
   object kinds, full ray physics, eye path analysis with fixed exposure, scene links, browser
   storage, undo and redo, touch, WCAG AA, the ray oracles in CI, deployed on Vercel. Users
   can test the eye hypothesis from this release.
2. Wave lab — slits and gratings with the Huygens sum, Fraunhofer overlay, measured-vs-theory
   panel and regime warning; the wave oracles in CI; the Rays / Waves switch.
3. Physical eye and camera — projections with fisheye correction, the model eye with the two
   new oracles, and the offline PWA.
4. GRIN glass and ray-mode grating — RK4 solver with boundary reflections; grating orders with
   wave-theory intensities.
5. Ripple view — GPU wave grid for watching waves spread.

## Two-year shape

Things that must not be rewritten, each with the rule that protects it:

- Scene format: every scene carries `"v"`; each format change adds a migration that is never
  deleted, and tests keep a sample link from every shipped version; one letter after `#` names
  the encoding, and a new encoding gets a new letter; the link JSON is the file format.
- Engine API: pure functions over the versioned scene JSON, data in and data out; the scene
  schema is the engine's input type, so one schema protects both links and library callers,
  and the worker boundary carries the same calls unchanged.

Growth paths that must not be blocked, each with its rule:

- Embeddable scenes: all app state is the scene in the URL hash and in memory, nothing else,
  so an iframe with a link needs no other setup.
- Classroom or lesson mode: new optional scene fields arrive as schema migrations, never as a
  second format.
- Accounts or a paid tier: saving and loading go through one interface over browser storage,
  so a backend replaces the implementation without touching callers.
- Engine as a published library: the package is built as its own workspace member with its
  own `package.json`, exports and tests from day one.

## Open questions

- The product name; "Light Lab" is a working title (`docs/vision.md`, "Still to decide") —
  Sayantan.
