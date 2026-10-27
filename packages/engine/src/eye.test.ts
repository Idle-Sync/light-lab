import { describe, expect, it } from 'vitest';
import { analyzeEye, type EyeGroup, pathLabel } from './eye';
import { parseScene, type SceneObject } from './scene';

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
