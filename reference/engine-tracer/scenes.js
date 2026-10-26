// Methods lifted verbatim from the prototype's `class Component extends DCLogic` in ui-mockup/ray-bench.dc.html.
// `this.*` calls resolve to sibling methods that now live in other reference folders.

  preset(name) {
    var D = Math.PI / 180;
    if (name === 'ball') return [
      { id: 1, type: 'point', x: -140, y: 8, ang: 0, cone: 40, rays: 61, spec: 'white' },
      { id: 2, type: 'ball', x: 0, y: 0, ang: 0, D: 70, mat: 'bk7' },
      { id: 3, type: 'eye', x: 150, y: -6, ang: Math.PI, pupil: 10, fov: 80 }
    ];
    if (name === 'magnifier') return [
      { id: 1, type: 'object', x: -40, y: 0, ang: 0, h: 20, cone: 50, rays: 9, spec: 589.3 },
      { id: 2, type: 'lens', x: 0, y: 0, ang: 0, R1: 60, R2: 60, D: 50, mat: 'bk7' },
      { id: 3, type: 'eye', x: 36, y: 0, ang: Math.PI, pupil: 8, fov: 70 }
    ];
    return [
      { id: 1, type: 'point', x: -220, y: -70, ang: 0, cone: 26, rays: 41, spec: 'white' },
      { id: 2, type: 'lens', x: -120, y: -70, ang: 0, R1: 50, R2: 50, D: 40, mat: 'bk7' },
      { id: 3, type: 'detector', x: -17, y: -70, ang: Math.PI / 2, len: 40 },
      { id: 4, type: 'beam', x: -209, y: 88, ang: -25 * D, width: 6, rays: 9, spec: 'white' },
      { id: 5, type: 'prism', x: -110, y: 60, ang: 0, side: 70, mat: 'sf11' },
      { id: 6, type: 'detector', x: 0, y: 135, ang: 130 * D, len: 70 },
      { id: 7, type: 'beam', x: 70, y: 20, ang: 0, width: 40, rays: 11, spec: 632.8 },
      { id: 8, type: 'arcmirror', x: 210, y: 20, ang: Math.PI, R: 140, D: 64, form: 'concave' },
      { id: 9, type: 'ruler', x: 175, y: 66, ang: 0, len: 70 }
    ];
  }
