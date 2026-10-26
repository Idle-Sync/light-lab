# Prototype reference code

This folder holds the code of the Light Lab prototype, split by module so the real site can be built from tested pieces. It is reference material, not the site. The goals and decisions it serves are in [`docs/vision.md`](../docs/vision.md).

Check its physics before reusing any of it:

```
$ node reference/checks/verify.mjs
pass  N-BK7 nd: got 1.5168, want 1.5168 ± 0.00001
pass  N-BK7 Abbe number: got 64.17, want 64.17 ± 0.01
...
all checks passed
```

## How the code is laid out

The prototype ran as two screens on a design canvas. Each screen is one file whose logic lives in a single `class Component extends DCLogic`. The `.js` files here are that class's methods lifted verbatim and grouped by job, so a `this.foo()` call inside one file may resolve to a method in another folder. Treat them as tested source to port, not as modules to import.

| Folder | What it holds | Key methods |
|---|---|---|
| `engine-materials/` | Sellmeier glass data and refractive index, thick-lens focal length | `G`, `n`, `spectrum`, `lensF` |
| `engine-geometry/` | Object shapes as segments and arcs, ray–segment and ray–arc hits | `prims`, `hit`, `lensGeom`, `arcGeom`, `prismVerts`, `rot`, `adiff` |
| `engine-tracer/` | Emission, Snell, Fresnel, total internal reflection, ray splitting, detectors, example scenes | `emit`, `spawn`, `trace`, `preset` |
| `engine-eye/` | Eye pass: grouping rays by path, least-squares image points, path labels | `record`, `analyze`, `pathLabel`, `pct` |
| `engine-waves/` | Huygens–Fresnel sum, Fraunhofer formula, fringe measurement | `compute` |
| `render-canvas/` | Additive ray drawing, objects, image markers, eye strip, wave plots | `draw`, `paintObj`, `paintImages`, `drawRetina` |
| `ui-mockup/` | The two complete screens, plus their interaction and inspector code | `ray-bench.dc.html`, `wave-lab.dc.html`, `onDown`, `onMove`, `inspector` |
| `checks/` | Physics oracles run against the `.dc.html` files | `verify.mjs` |

The two `.dc.html` files are the complete source. The split `.js` files are copies of their methods. If they ever disagree, the `.dc.html` files win.

## What will bite when porting

| Prototype habit | Port it as |
|---|---|
| One class holds engine, renderer and interface | Engine in plain TypeScript with no DOM or p5 imports; renderer and interface on top |
| `this.scene`, `this.v` and `this.sel` are mutable instance fields | An explicit scene model with undo history |
| Brightness on the eye strip is relative to the brightest path | Fixed exposure, see the eye section of the vision doc |
| Eye strip maps angle linearly, which is a fisheye | Selectable projection, rectilinear by default |
| Glass objects must not overlap, because inside or outside is decided by surface normals | Keep the rule, or track the medium a ray is in |
| `verify.mjs` builds the class with `new Function` from the local `.dc.html` files | Fine for these trusted local files; the site's tests import the engine directly |
