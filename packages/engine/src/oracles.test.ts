import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { analyzeEye } from './eye';
import { refractiveIndex } from './materials';
import { parseScene, type Scene } from './scene';
import { trace } from './trace';

// The physics oracles of reference/checks/verify.mjs, with the same expected values and tolerances.

function expectNear(got: number, want: number, tolerance: number): void {
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tolerance);
}

function eyeIdOf(scene: Scene): number {
  const eye = scene.objects.find((object) => object.kind === 'eye');
  if (!eye) throw new Error('the scene has no eye');
  return eye.id;
}

const nd = refractiveIndex('bk7', 587.56);

describe('glass oracles', () => {
  it('N-BK7 nd is 1.5168 ± 0.00001 (Schott datasheet)', () => {
    expectNear(nd, 1.5168, 1e-5);
  });

  it('N-BK7 Abbe number is 64.17 ± 0.01 (Schott datasheet)', () => {
    const abbe = (nd - 1) / (refractiveIndex('bk7', 486.13) - refractiveIndex('bk7', 656.27));
    expectNear(abbe, 64.17, 0.01);
  });
});

describe('thick lens oracle', () => {
  it('images a point 100 mm before the bench lens at x = -16.85 ± 0.05', () => {
    const [source, lens] = examples.bench.objects;
    if (source.kind !== 'point') throw new Error('the bench example no longer starts with a point');
    const scene = parseScene({
      v: 1,
      objects: [{ ...source, spectrum: 587.56, rays: 3, cone: 2 }, lens],
    });

    const segments: number[][] = [];
    for (const bucket of Object.values(trace(scene).buckets)) {
      for (let i = 0; i < bucket.points.length; i += 4)
        segments.push(bucket.points.slice(i, i + 4));
    }
    // An off-axis ray leaving the lens: it ends 4000 mm away because nothing stops it.
    const leaving = segments.find(
      ([x0, y0, x1, y1]) => x0 > -116 && x1 > 1000 && Math.abs(y1 - y0) > 1e-6,
    );
    if (!leaving) throw new Error('no off-axis ray leaves the lens');
    const [x0, y0, x1, y1] = leaving;
    const slope = (y1 - y0) / (x1 - x0);
    expectNear(x0 - (y0 + 70) / slope, -16.85, 0.05);
  });
});

describe('glass ball oracles', () => {
  const ball = analyzeEye(examples.ball, eyeIdOf(examples.ball));
  const direct = ball.rows[0];

  it('keeps (1 - R)^2 = 0.917 ± 0.002 on the straight-through path', () => {
    const normalReflectance = ((nd - 1) / (nd + 1)) ** 2;
    expectNear(direct.transmission, (1 - normalReflectance) ** 2, 0.002);
    expectNear(direct.transmission, 0.917, 0.002);
  });

  it('forms a real image at x = 79.9 ± 0.5', () => {
    if (!direct.top.image) throw new Error('the direct path has no image point');
    expectNear(direct.top.image[0], 79.9, 0.5);
  });
});

describe('magnifier oracles', () => {
  const magnifier = analyzeEye(examples.magnifier, eyeIdOf(examples.magnifier));

  it('forms a virtual image at x = -101.4 ± 1.5', () => {
    const base = magnifier.groups.find(
      (group) => group.path === magnifier.rows[0].path && group.pointIndex === 0,
    );
    if (!base?.image) throw new Error('the base of the object has no image point');
    expectNear(base.image[0], -101.4, 1.5);
  });

  it('never lets more than all of the light into the pupil', () => {
    expect(magnifier.totalIntoPupil).toBeGreaterThan(0);
    expect(magnifier.totalIntoPupil).toBeLessThanOrEqual(1);
  });
});
