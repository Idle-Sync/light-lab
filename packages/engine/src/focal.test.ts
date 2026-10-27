import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { focalPoints, measuredFocalLength } from './focal';
import { refractiveIndex, thickLensFocalLength } from './materials';
import type { SceneObject } from './scene';

describe('measuredFocalLength', () => {
  it('agrees with the thick-lens equation for the bench lens within 2 %', () => {
    const lens = examples.bench.objects.find((object) => object.kind === 'lens');
    if (lens?.kind !== 'lens') throw new Error('the bench example has no lens');
    const theory = thickLensFocalLength(lens, refractiveIndex('bk7', 587.56));
    const measured = measuredFocalLength(lens, 587.56);
    if (measured === null) throw new Error('the bench lens has no measured focal length');
    expect(Math.abs(measured - theory) / theory).toBeLessThan(0.02);
  });

  it('gives R / 2 for a concave mirror and -R / 2 for a convex one', () => {
    const mirror: SceneObject = {
      kind: 'arcMirror',
      id: 1,
      x: 30,
      y: -20,
      angle: 40,
      radius: 140,
      diameter: 20,
      form: 'concave',
    };
    expect(measuredFocalLength(mirror, 550)).toBeCloseTo(70, 0);
    expect(measuredFocalLength({ ...mirror, form: 'convex' }, 550)).toBeCloseTo(-70, 0);
  });

  it('is null for a flat mirror', () => {
    const mirror: SceneObject = { kind: 'mirror', id: 1, x: 0, y: 0, angle: 0, length: 40 };
    expect(measuredFocalLength(mirror, 550)).toBeNull();
  });
});

describe('focalPoints', () => {
  it('finds a focal point on each side of the bench lens, at its focal length from the centre', () => {
    const lens = examples.bench.objects.find((object) => object.kind === 'lens');
    if (lens?.kind !== 'lens') throw new Error('the bench example has no lens');
    const focal = thickLensFocalLength(lens, refractiveIndex('bk7', 587.56));
    const points = focalPoints(lens, 587.56);
    expect(points).toHaveLength(2);
    for (const point of points) {
      const distance = Math.hypot(point.x - lens.x, point.y - lens.y);
      expect(Math.abs(distance - focal) / focal).toBeLessThan(0.05);
    }
  });

  it('puts the focal point of a concave mirror in front of it and of a convex one behind', () => {
    const mirror: SceneObject = {
      kind: 'arcMirror',
      id: 1,
      x: 0,
      y: 0,
      angle: 0,
      radius: 140,
      diameter: 20,
      form: 'concave',
    };
    const [front] = focalPoints(mirror, 550);
    expect(front.x).toBeCloseTo(70, 0);
    const [behind] = focalPoints({ ...mirror, form: 'convex' }, 550);
    expect(behind.x).toBeCloseTo(-70, 0);
  });

  it('finds none for a flat mirror', () => {
    expect(focalPoints({ kind: 'mirror', id: 1, x: 0, y: 0, angle: 0, length: 40 }, 550)).toEqual(
      [],
    );
  });
});
