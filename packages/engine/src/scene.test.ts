import {
  examples,
  fieldRanges,
  maxObjects,
  parseScene,
  parseSceneObject,
  SceneError,
  wrapAngle,
} from '@light-lab/engine';
import { describe, expect, it } from 'vitest';

describe('parseScene', () => {
  it('accepts every example scene unchanged', () => {
    for (const scene of Object.values(examples)) {
      expect(parseScene(scene)).toEqual(scene);
    }
  });

  it('fills missing settings with their defaults', () => {
    const scene = parseScene({ v: 2, objects: [] });
    expect(scene.settings).toEqual({
      partialReflections: true,
      polarization: 'unpolarized',
      brightness: '2d',
      grid: { show: true, size: 10, snap: false },
      sightLines: true,
    });
  });

  // A link with a microscopic grid would otherwise make the bench draw millions of lines.
  it.each([0.001, 0, -5, 10_000])('rejects a grid size of %s mm', (size) => {
    const parse = () => parseScene({ v: 2, settings: { grid: { size } }, objects: [] });
    expect(parse).toThrowError(SceneError);
    expect(parse).toThrowError(/^settings\.grid\.size: [^\n]+$/);
  });

  it('rejects a scene without a version', () => {
    const parse = () => parseScene({ objects: [] });
    expect(parse).toThrowError(SceneError);
    expect(parse).toThrowError(/^v: [^\n]+$/);
  });

  it('rejects an unknown kind', () => {
    const scene = { v: 2, objects: [{ kind: 'laser', id: 1, x: 0, y: 0, angle: 0 }] };
    const parse = () => parseScene(scene);
    expect(parse).toThrowError(SceneError);
    expect(parse).toThrowError(/^objects\.0\.kind: [^\n]+$/);
  });

  // A mirror carrying a lens's radius would otherwise load and silently lose the field.
  it("rejects an object carrying another kind's fields", () => {
    const mirror = { kind: 'mirror', id: 1, x: 0, y: 0, angle: 0, length: 60, radius1: 50 };
    const parse = () => parseScene({ v: 2, objects: [mirror] });
    expect(parse).toThrowError(SceneError);
    expect(parse).toThrowError(/^objects\.0\.radius1: [^\n]+$/);
  });
});

describe('parseSceneObject', () => {
  it('rejects a field from another kind', () => {
    const lensWithLength = { ...examples.bench.objects[1], length: 40 };
    expect(() => parseSceneObject(lensWithLength)).toThrowError(/^length: [^\n]+$/);
  });
});

const placed = { id: 1, x: 0, y: 0, angle: 0 };

// Every bounded field of every kind with its limits as the inspector sliders show them.
const boundedFields = [
  {
    kind: 'point',
    base: { cone: 30, rays: 31, spectrum: 'white' },
    field: 'rays',
    min: 1,
    max: 201,
  },
  {
    kind: 'point',
    base: { cone: 30, rays: 31, spectrum: 'white' },
    field: 'cone',
    min: 1,
    max: 360,
  },
  { kind: 'beam', base: { width: 20, rays: 9, spectrum: 532 }, field: 'rays', min: 1, max: 61 },
  { kind: 'beam', base: { width: 20, rays: 9, spectrum: 532 }, field: 'width', min: 1, max: 120 },
  {
    kind: 'object',
    base: { height: 20, cone: 40, rays: 9, spectrum: 589.3 },
    field: 'height',
    min: 2,
    max: 150,
  },
  {
    kind: 'object',
    base: { height: 20, cone: 40, rays: 9, spectrum: 589.3 },
    field: 'rays',
    min: 1,
    max: 61,
  },
  {
    kind: 'object',
    base: { height: 20, cone: 40, rays: 9, spectrum: 589.3 },
    field: 'cone',
    min: 1,
    max: 180,
  },
  { kind: 'mirror', base: { length: 60 }, field: 'length', min: 5, max: 300 },
  {
    kind: 'arcMirror',
    base: { radius: 120, diameter: 60, form: 'concave' },
    field: 'radius',
    min: 20,
    max: 600,
  },
  {
    kind: 'arcMirror',
    base: { radius: 120, diameter: 60, form: 'concave' },
    field: 'diameter',
    min: 4,
    max: 200,
  },
  {
    kind: 'lens',
    base: { radius1: 60, radius2: 60, diameter: 40, material: 'bk7' },
    field: 'radius1',
    min: 10,
    max: 400,
  },
  {
    kind: 'lens',
    base: { radius1: 60, radius2: 60, diameter: 40, material: 'bk7' },
    field: 'radius2',
    min: 10,
    max: 400,
  },
  {
    kind: 'lens',
    base: { radius1: 60, radius2: 60, diameter: 40, material: 'bk7' },
    field: 'diameter',
    min: 4,
    max: 120,
  },
  { kind: 'prism', base: { side: 60, material: 'sf11' }, field: 'side', min: 10, max: 200 },
  { kind: 'ball', base: { diameter: 30, material: 'bk7' }, field: 'diameter', min: 2, max: 150 },
  { kind: 'blocker', base: { length: 40 }, field: 'length', min: 2, max: 300 },
  { kind: 'detector', base: { length: 50 }, field: 'length', min: 2, max: 300 },
  { kind: 'ruler', base: { length: 50 }, field: 'length', min: 1, max: 500 },
  { kind: 'eye', base: { pupil: 8, fieldOfView: 70 }, field: 'pupil', min: 1, max: 10 },
  { kind: 'eye', base: { pupil: 8, fieldOfView: 70 }, field: 'fieldOfView', min: 10, max: 170 },
];

function parseOne(object: object): void {
  parseScene({ v: 2, objects: [object] });
}

describe('field bounds', () => {
  it('accepts one object of every kind with every field at its minimum, and again at its maximum', () => {
    const kinds = [...new Set(boundedFields.map((row) => row.kind))];
    for (const edge of ['min', 'max'] as const) {
      for (const kind of kinds) {
        const object: Record<string, unknown> = { kind, ...placed };
        const rows = boundedFields.filter((row) => row.kind === kind);
        Object.assign(object, rows[0].base);
        for (const row of rows) object[row.field] = row[edge];
        object.x = edge === 'min' ? -10000 : 10000;
        object.y = object.x;
        object.angle = edge === 'min' ? -180 : 180;
        parseOne(object);
      }
    }
  });

  it.each(
    boundedFields.flatMap((row) => [
      { ...row, bad: row.min - 1 },
      { ...row, bad: row.max + 1 },
    ]),
  )('rejects $kind $field of $bad', (row) => {
    const object = { kind: row.kind, ...placed, ...row.base, [row.field]: row.bad };
    expect(() => parseOne(object)).toThrowError(SceneError);
    expect(() => parseOne(object)).toThrowError(new RegExp(`^objects\\.0\\.${row.field}: `));
  });

  it('rejects 0 beam rays and 62 beam rays', () => {
    const beam = { kind: 'beam', ...placed, width: 20, spectrum: 532 };
    expect(() => parseOne({ ...beam, rays: 0 })).toThrowError(/^objects\.0\.rays: /);
    expect(() => parseOne({ ...beam, rays: 62 })).toThrowError(/^objects\.0\.rays: /);
  });

  it('rejects a mirror a billion mm long', () => {
    const mirror = { kind: 'mirror', ...placed, length: 1e9 };
    expect(() => parseOne(mirror)).toThrowError(SceneError);
    expect(() => parseOne(mirror)).toThrowError(/^objects\.0\.length: /);
  });

  it.each(['rays', 'cone'])('rejects a point with %s of a billion', (field) => {
    const point = { kind: 'point', ...placed, cone: 30, rays: 31, spectrum: 'white', [field]: 1e9 };
    expect(() => parseOne(point)).toThrowError(new RegExp(`^objects\\.0\\.${field}: `));
  });

  it.each(['x', 'y', 'angle'])('rejects %s that is not a finite number', (field) => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const ruler = { kind: 'ruler', ...placed, length: 50, [field]: bad };
      expect(() => parseOne(ruler)).toThrowError(new RegExp(`^objects\\.0\\.${field}: `));
    }
  });

  it('keeps positions within 10000 mm and angles within 180 degrees', () => {
    const ruler = { kind: 'ruler', ...placed, length: 50 };
    parseOne({ ...ruler, x: 10000 });
    expect(() => parseOne({ ...ruler, x: 10001 })).toThrowError(/^objects\.0\.x: /);
    expect(() => parseOne({ ...ruler, angle: 181 })).toThrowError(/^objects\.0\.angle: /);
  });

  it.each([-1, 1.5])('rejects an id of %s', (id) => {
    expect(() => parseOne({ kind: 'ruler', ...placed, length: 50, id })).toThrowError(
      /^objects\.0\.id: /,
    );
  });

  it.each([379, 781])('rejects a spectrum of %s nm', (spectrum) => {
    const beam = { kind: 'beam', ...placed, width: 20, rays: 9, spectrum };
    expect(() => parseOne(beam)).toThrowError(/^objects\.0\.spectrum: /);
  });

  it('accepts spectra of 380 and 780 nm', () => {
    for (const spectrum of [380, 780]) {
      parseOne({ kind: 'beam', ...placed, width: 20, rays: 9, spectrum });
    }
  });

  it('holds at most maxObjects objects', () => {
    const ruler = { kind: 'ruler', ...placed, length: 50 };
    const objects = Array.from({ length: maxObjects }, (_, id) => ({ ...ruler, id }));
    parseScene({ v: 2, objects });
    expect(() =>
      parseScene({ v: 2, objects: [...objects, { ...ruler, id: maxObjects }] }),
    ).toThrowError(/^objects: /);
  });

  it('rejects a lens wider than its radii allow', () => {
    const lens = {
      kind: 'lens',
      ...placed,
      radius1: 60,
      radius2: 30,
      diameter: 59,
      material: 'bk7',
    };
    parseOne({ ...lens, diameter: 1.96 * 30 });
    expect(() => parseOne(lens)).toThrowError(SceneError);
    expect(() => parseOne(lens)).toThrowError(/^objects\.0\.diameter: /);
  });

  it('rejects a curved mirror wider than its radius allows', () => {
    const mirror = { kind: 'arcMirror', ...placed, radius: 20, diameter: 40, form: 'concave' };
    parseOne({ ...mirror, diameter: 1.96 * 20 });
    expect(() => parseOne(mirror)).toThrowError(/^objects\.0\.diameter: /);
  });

  it('reports the same bounds for a single object', () => {
    const mirror = { kind: 'mirror', ...placed, length: 1e9 };
    expect(() => parseSceneObject(mirror)).toThrowError(/^length: /);
  });

  it('exposes the ranges the schema enforces', () => {
    expect(fieldRanges.position).toEqual({ min: -10000, max: 10000 });
    expect(fieldRanges.angle).toEqual({ min: -180, max: 180 });
    expect(fieldRanges.wavelength).toEqual({ min: 380, max: 780 });
  });
});

describe('wrapAngle', () => {
  it.each([
    [250, -110],
    [-250, 110],
    [180, 180],
    [-180, 180],
    [540, 180],
    [0, 0],
    [-90, -90],
  ])('turns %s into %s', (degrees, wrapped) => {
    expect(wrapAngle(degrees)).toBe(wrapped);
  });
});
