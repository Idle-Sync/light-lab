import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { measuredFocalLength } from './focal';
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
