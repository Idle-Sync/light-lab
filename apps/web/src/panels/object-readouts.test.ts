import type { DetectorReading, SceneObject } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { objectReadouts } from './object-readouts';

const placement = { id: 1, x: 0, y: 0, angle: 0 };

const onePerKind: SceneObject[] = [
  { kind: 'point', ...placement, cone: 30, rays: 9, spectrum: 'white' },
  { kind: 'beam', ...placement, width: 10, rays: 5, spectrum: 589.3 },
  { kind: 'object', ...placement, height: 20, cone: 50, rays: 9, spectrum: 589.3 },
  { kind: 'mirror', ...placement, length: 50 },
  { kind: 'arcMirror', ...placement, radius: 100, diameter: 40, form: 'concave' },
  {
    kind: 'lens',
    ...placement,
    radius1: 50,
    radius2: 50,
    diameter: 30,
    material: 'bk7',
  },
  { kind: 'prism', ...placement, side: 40, material: 'sf11' },
  { kind: 'ball', ...placement, diameter: 30, material: 'silica' },
  { kind: 'blocker', ...placement, length: 20 },
  { kind: 'detector', ...placement, length: 40 },
  { kind: 'ruler', ...placement, length: 50 },
  { kind: 'eye', ...placement, pupil: 8, fieldOfView: 70 },
];

const lit: DetectorReading = {
  power: 0.3,
  centroid: 1,
  rmsWidth: 2,
  hits: 1234,
  bins: {
    intensity: Float64Array.of(1),
    red: Float64Array.of(1),
    green: Float64Array.of(1),
    blue: Float64Array.of(1),
  },
};

describe('objectReadouts', () => {
  it('explains every readout of every kind in one sentence', () => {
    for (const object of onePerKind) {
      for (const brightness of ['2d', '3d'] as const) {
        for (const reading of [undefined, lit]) {
          for (const item of objectReadouts(object, reading, brightness)) {
            expect(item.explanation, `${object.kind} ${item.label}`).toMatch(/^[^.]+\.$/);
          }
        }
      }
    }
  });

  it('gives a detector with light more readouts than one without', () => {
    const detector = onePerKind[9];
    expect(objectReadouts(detector, lit, '2d').length).toBeGreaterThan(
      objectReadouts(detector, undefined, '2d').length,
    );
  });
});
