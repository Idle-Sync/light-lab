import { describe, expect, it, vi } from 'vitest';
import { examples } from './examples';
import { analyzeEye, type EyeGroup, pathLabel } from './eye';
import { parseScene, type SceneObject } from './scene';
import { followRays } from './trace';

vi.mock('./trace', async (importOriginal) => {
  const trace = await importOriginal<typeof import('./trace')>();
  return { ...trace, followRays: vi.fn(trace.followRays) };
});

const eye: SceneObject = { kind: 'eye', id: 9, x: 0, y: 0, angle: 180, pupil: 8, fieldOfView: 70 };

describe('analyzeEye', () => {
  it('sees an object of height h at distance d span 2·atan(h / 2d)', () => {
    const height = 20;
    for (const distance of [50, 100, 200]) {
      const object: SceneObject = {
        kind: 'object',
        id: 1,
        x: -distance,
        y: height / 2,
        angle: 0,
        height,
        cone: 50,
        rays: 9,
        spectrum: 587.56,
      };
      const analysis = analyzeEye(parseScene({ v: 2, objects: [object, eye] }), eye.id);
      const endPoint = (pointIndex: number): EyeGroup => {
        const group = analysis.groups.find((g) => g.pointIndex === pointIndex && g.path === '');
        if (!group) throw new Error(`no direct group for emitting point ${pointIndex}`);
        return group;
      };
      const span = Math.abs(endPoint(0).angle - endPoint(8).angle);
      expect(Math.abs(span - 2 * Math.atan(height / (2 * distance)))).toBeLessThanOrEqual(1e-3);
    }
  });

  it('lets more of a white point source into the pupil as the eye approaches', () => {
    const totals: number[] = [];
    for (const distance of [200, 100, 50]) {
      const source: SceneObject = {
        kind: 'point',
        id: 1,
        x: -distance,
        y: 0,
        angle: 0,
        cone: 60,
        rays: 41,
        spectrum: 'white',
      };
      const analysis = analyzeEye(parseScene({ v: 2, objects: [source, eye] }), eye.id);
      expect(analysis.groups.map((group) => group.nm).sort()).toEqual([
        400, 445, 490, 535, 580, 625, 670,
      ]);
      totals.push(analysis.totalIntoPupil);
    }
    expect(totals[1]).toBeGreaterThan(totals[0]);
    expect(totals[2]).toBeGreaterThan(totals[1]);
  });

  it('the magnifier eye pass samples the pupil, not the whole cone', () => {
    const scene = examples.magnifier;
    const magnifierEye = scene.objects.find((object) => object.kind === 'eye');
    if (magnifierEye?.kind !== 'eye') throw new Error('the magnifier example has no eye');
    vi.mocked(followRays).mockClear();
    analyzeEye(scene, magnifierEye.id);
    expect(vi.mocked(followRays).mock.results[0].value).toBeLessThan(30000);

    const raysFromPoint = new Map<number, number>();
    followRays(
      scene,
      'eye',
      {
        onSegment(ray) {
          if (ray.depth > 0) return;
          raysFromPoint.set(ray.pointIndex, (raysFromPoint.get(ray.pointIndex) ?? 0) + 1);
        },
        onDetector() {},
        onEye() {},
      },
      magnifierEye,
    );
    expect(Math.max(...raysFromPoint.values())).toBeLessThanOrEqual(250);
  });

  it('lets as much of the magnifier and the glass ball into the pupil as the dense pass did', () => {
    // Totals measured with a ray every 0.05° of cone.
    const magnifier = analyzeEye(examples.magnifier, 3);
    const ball = analyzeEye(examples.ball, 3);
    expect(Math.abs(magnifier.totalIntoPupil / 0.169 - 1)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(ball.totalIntoPupil / 0.1028 - 1)).toBeLessThanOrEqual(0.03);
  });

  it('keeps at least 20 rays on the direct path from a point 300 mm in front of the pupil', () => {
    const source: SceneObject = {
      kind: 'point',
      id: 1,
      x: -300,
      y: 0,
      angle: 0,
      cone: 20,
      rays: 41,
      spectrum: 589.3,
    };
    const analysis = analyzeEye(parseScene({ v: 2, objects: [source, eye] }), eye.id);
    expect(analysis.rows[0].path).toBe('');
    expect(analysis.rows[0].rayCount).toBeGreaterThanOrEqual(20);
  });

  it('still sees the virtual image in a convex mirror', () => {
    const scene = parseScene({
      v: 2,
      objects: [
        { kind: 'point', id: 1, x: -100, y: -12, angle: 7, cone: 30, rays: 41, spectrum: 589.3 },
        {
          kind: 'arcMirror',
          id: 2,
          x: 0,
          y: 0,
          angle: 180,
          radius: 20,
          diameter: 30,
          form: 'convex',
        },
        { kind: 'eye', id: 3, x: -100, y: 10, angle: 0, pupil: 10, fieldOfView: 70 },
      ],
    });
    const analysis = analyzeEye(scene, 3);
    // Image point and total measured with a ray every 0.05° of cone.
    const { top } = analysis.rows[0];
    expect(top.kind).toBe('virtual');
    if (!top.image) throw new Error('the mirror path has no image point');
    expect(Math.hypot(top.image[0] - 9, top.image[1] + 1.1)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(analysis.totalIntoPupil / 0.01667 - 1)).toBeLessThanOrEqual(0.03);
  });

  it('refuses an eye id that is not in the scene', () => {
    expect(() => analyzeEye(parseScene({ v: 2, objects: [eye] }), 4)).toThrow('no eye with id 4');
  });
});

describe('pathLabel', () => {
  it('names an empty path as light straight from the source', () => {
    expect(pathLabel('')).toBe('Straight from the source');
  });

  it('counts each kind of event in a path code', () => {
    expect(pathLabel('t2i3x3i4t5m0e1')).toBe(
      '2 refractions, 3 internal reflections, 1 total, 1 surface reflection, 1 mirror bounce',
    );
  });
});
