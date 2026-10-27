import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { surfacesOf } from './geometry';
import { refractiveIndex } from './materials';
import { parseScene, type Scene, type SceneObject, type Settings, wrapAngle } from './scene';
import { emitRays, followRays, fresnelReflectance, type TracedRay, trace } from './trace';

const prism: SceneObject = {
  kind: 'prism',
  id: 1,
  x: 0,
  y: 0,
  angle: 0,
  side: 70,
  material: 'bk7',
};

/** A one-ray source aimed at the middle of the prism's first face, `incidence` degrees off its normal. */
function rayOntoPrismFace(incidence: number, settings: Partial<Settings>): Scene {
  const face = surfacesOf(prism)[0];
  if (face.shape !== 'segment' || !face.normal) throw new Error('a prism face is a segment');
  const middleX = (face.start.x + face.end.x) / 2;
  const middleY = (face.start.y + face.end.y) / 2;
  const inward = Math.atan2(-face.normal.y, -face.normal.x) + (incidence * Math.PI) / 180;
  const source: SceneObject = {
    kind: 'point',
    id: 2,
    x: middleX - 50 * Math.cos(inward),
    y: middleY - 50 * Math.sin(inward),
    angle: wrapAngle((inward * 180) / Math.PI),
    cone: 1,
    rays: 1,
    spectrum: 587.56,
  };
  return parseScene({ v: 2, settings, objects: [prism, source] });
}

function drawnRays(scene: Scene): TracedRay[] {
  const rays: TracedRay[] = [];
  followRays(scene, 'drawing', {
    onSegment: (ray) => rays.push(ray),
    onDetector: () => {},
    onEye: () => {},
  });
  return rays;
}

function detectorPower(scene: Scene, detectorId: number): number {
  const reading = trace(scene).detectors[detectorId];
  if (!reading) throw new Error(`no reading for detector ${detectorId}`);
  return reading.power;
}

describe('Brewster angle', () => {
  const n = refractiveIndex('bk7', 587.56);
  const brewster = Math.atan(n);

  it('reflects no p-polarized light and some unpolarized light', () => {
    const { rs2, rp2 } = fresnelReflectance(1, n, Math.cos(brewster));
    expect(rp2).toBeLessThan(1e-12);
    expect((rs2 + rp2) / 2).toBeGreaterThan(0.01);
  });

  it('spawns no reflection from the face for p-polarized light', () => {
    const scene = rayOntoPrismFace((brewster * 180) / Math.PI, { polarization: 'p' });
    const reflections = drawnRays(scene).filter((ray) => ray.path === 'e0');
    expect(reflections).toEqual([]);
  });

  it('spawns a reflection carrying more than 1 % for unpolarized light', () => {
    const scene = rayOntoPrismFace((brewster * 180) / Math.PI, { polarization: 'unpolarized' });
    const reflections = drawnRays(scene).filter((ray) => ray.path === 'e0');
    expect(reflections).toHaveLength(1);
    expect(reflections[0].intensity).toBeGreaterThan(0.01);
  });

  it('spawns no partial reflection at any angle when partial reflections are off', () => {
    for (let incidence = 0; incidence < 90; incidence += 5) {
      const scene = rayOntoPrismFace(incidence, { partialReflections: false });
      // Total internal reflection ('x') is not partial, so it stays on.
      const partial = drawnRays(scene).filter((ray) => /[ei]/.test(ray.path));
      expect(partial).toEqual([]);
    }
  });
});

describe('detector power', () => {
  const [source, lens] = examples.bench.objects;
  if (source.kind !== 'point') throw new Error('the bench example no longer starts with a point');
  const detector: SceneObject = { kind: 'detector', id: 3, x: -17, y: -70, angle: 90, length: 60 };

  it('does not depend on the number of drawn rays when nothing clips the fan', () => {
    const powerWith = (rays: number) =>
      detectorPower(
        parseScene({ v: 2, objects: [{ ...source, cone: 20, rays }, lens, detector] }),
        3,
      );
    const fewRays = powerWith(11);
    const manyRays = powerWith(101);
    expect(manyRays).toBeGreaterThan(0.8);
    expect(Math.abs(fewRays - manyRays) / manyRays).toBeLessThan(0.01);
  });

  const object: SceneObject = {
    kind: 'object',
    id: 1,
    x: 0,
    y: 10,
    angle: 0,
    height: 20,
    cone: 50,
    rays: 9,
    spectrum: 'white',
  };
  const wall: SceneObject = { kind: 'detector', id: 2, x: 20, y: 0, angle: 90, length: 200 };

  it('never exceeds 1 for an extended object, whose power is shared by its emitting points', () => {
    const power = detectorPower(parseScene({ v: 2, objects: [object, wall] }), 2);
    expect(power).toBeGreaterThan(0.99);
    // Summing equal shares can round one unit in the last place above 1.
    expect(power).toBeLessThanOrEqual(1 + 1e-12);
  });

  it('never exceeds 1 for a sensor close to an extended object with the 3D equivalent on', () => {
    const scene = parseScene({ v: 2, settings: { brightness: '3d' }, objects: [object, wall] });
    expect(detectorPower(scene, 2)).toBeLessThanOrEqual(1);
  });

  it('never exceeds 1 for a sensor wider than its distance from a point source in 3D', () => {
    const scene = parseScene({
      v: 2,
      settings: { brightness: '3d' },
      objects: [
        { kind: 'point', id: 1, x: 0, y: 0, angle: 0, cone: 60, rays: 101, spectrum: 587.56 },
        { kind: 'detector', id: 2, x: 5, y: 0, angle: 90, length: 40 },
      ],
    });
    expect(detectorPower(scene, 2)).toBeLessThanOrEqual(1);
  });
});

describe('brightness with distance', () => {
  function readingAt(distance: number, brightness: Settings['brightness']): number {
    const scene = parseScene({
      v: 2,
      settings: { brightness },
      objects: [
        { kind: 'point', id: 1, x: 0, y: 0, angle: 0, cone: 60, rays: 201, spectrum: 587.56 },
        { kind: 'detector', id: 2, x: distance, y: 0, angle: 90, length: 20 },
      ],
    });
    return detectorPower(scene, 2);
  }

  it('halves at twice the distance in 2D', () => {
    const ratio = readingAt(200, '2d') / readingAt(100, '2d');
    expect(Math.abs(ratio / 0.5 - 1)).toBeLessThanOrEqual(0.03);
  });

  it('quarters at twice the distance with the 3D equivalent on', () => {
    const ratio = readingAt(200, '3d') / readingAt(100, '3d');
    expect(Math.abs(ratio / 0.25 - 1)).toBeLessThanOrEqual(0.03);
  });
});

describe('ray counts', () => {
  const point: SceneObject = {
    kind: 'point',
    id: 1,
    x: 0,
    y: 0,
    angle: 0,
    cone: 360,
    rays: 201,
    spectrum: 'white',
  };

  it('the drawing pass never draws more rays than the inspector allows', () => {
    const beam: SceneObject = {
      kind: 'beam',
      id: 2,
      x: 0,
      y: 0,
      angle: 0,
      width: 20,
      rays: 61,
      spectrum: 'white',
    };
    const object: SceneObject = {
      kind: 'object',
      id: 3,
      x: 0,
      y: 0,
      angle: 0,
      height: 20,
      cone: 50,
      rays: 61,
      spectrum: 'white',
    };
    expect(emitRays({ ...point, rays: 50000 }, 'drawing')).toHaveLength(201 * 7);
    expect(emitRays({ ...beam, rays: 50000 }, 'drawing')).toHaveLength(61 * 7);
    // The drawing pass emits from both ends of an extended object.
    expect(emitRays({ ...object, rays: 50000 }, 'drawing')).toHaveLength(61 * 7 * 2);
  });

  // Each source emits 1,407 rays when drawing and 7,000 for the eye, so the first 29 or 58
  // sources already fill the pass's segment cap.
  it.each([
    { pass: 'drawing', sourceCount: 100 },
    { pass: 'eye', sourceCount: 60 },
  ] as const)(
    'a scene past the segment cap never emits its last source ($pass pass)',
    ({ pass, sourceCount }) => {
      const objects: SceneObject[] = [];
      for (let id = 0; id < sourceCount; id += 1) objects.push({ ...point, id });
      const seen = new Set<number>();
      followRays(parseScene({ v: 2, objects }), pass, {
        onSegment: (ray) => seen.add(ray.sourceId),
        onDetector: () => {},
        onEye: () => {},
      });
      expect(seen.has(sourceCount - 1)).toBe(false);
    },
  );
});
