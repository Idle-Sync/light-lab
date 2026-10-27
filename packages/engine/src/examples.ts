import { defaultSettings, type Scene } from './scene';

const bench: Scene = {
  v: 3,
  settings: { ...defaultSettings },
  objects: [
    { kind: 'point', id: 1, x: -220, y: -70, angle: 0, cone: 26, rays: 41, spectrum: 'white' },
    {
      kind: 'lens',
      id: 2,
      x: -120,
      y: -70,
      angle: 0,
      radius1: 50,
      radius2: 50,
      diameter: 40,
      material: 'bk7',
    },
    { kind: 'detector', id: 3, x: -17, y: -70, angle: 90, length: 40 },
    { kind: 'beam', id: 4, x: -209, y: 88, angle: -25, width: 6, rays: 9, spectrum: 'white' },
    { kind: 'prism', id: 5, x: -110, y: 60, angle: 0, side: 70, material: 'sf11' },
    { kind: 'detector', id: 6, x: 0, y: 135, angle: 130, length: 70 },
    { kind: 'beam', id: 7, x: 70, y: 20, angle: 0, width: 40, rays: 11, spectrum: 632.8 },
    {
      kind: 'arcMirror',
      id: 8,
      x: 210,
      y: 20,
      angle: 180,
      radius: 140,
      diameter: 64,
      form: 'concave',
    },
    { kind: 'ruler', id: 9, x: 175, y: 66, angle: 0, length: 70 },
  ],
};

const ball: Scene = {
  v: 3,
  settings: { ...defaultSettings },
  objects: [
    { kind: 'point', id: 1, x: -140, y: 8, angle: 0, cone: 40, rays: 61, spectrum: 'white' },
    { kind: 'ball', id: 2, x: 0, y: 0, angle: 0, diameter: 70, material: 'bk7' },
    { kind: 'eye', id: 3, x: 150, y: -6, angle: 180, pupil: 10, fieldOfView: 80 },
  ],
};

const magnifier: Scene = {
  v: 3,
  settings: { ...defaultSettings },
  objects: [
    {
      kind: 'object',
      id: 1,
      x: -40,
      y: 0,
      angle: 0,
      height: 20,
      cone: 50,
      rays: 9,
      spectrum: 589.3,
    },
    {
      kind: 'lens',
      id: 2,
      x: 0,
      y: 0,
      angle: 0,
      radius1: 60,
      radius2: 60,
      diameter: 50,
      material: 'bk7',
    },
    { kind: 'eye', id: 3, x: 36, y: 0, angle: 180, pupil: 8, fieldOfView: 70 },
  ],
};

/** The prototype's three example scenes. */
export const examples = { bench, ball, magnifier };
