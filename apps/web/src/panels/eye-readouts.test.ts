import type { EyeAnalysis, EyeGroup } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { eyeReadouts } from './eye-readouts';

const group: EyeGroup = {
  sourceId: 1,
  pointIndex: 0,
  nm: 589.3,
  path: 't0t0',
  power: 0.4,
  rayCount: 5,
  transmission: 0.9,
  kind: 'real',
  image: [0, 0],
  distance: 100,
  angle: 0,
  visible: true,
  low: null,
  high: null,
};

const analysis: EyeAnalysis = {
  eyeId: 3,
  groups: [group],
  rows: [
    {
      path: 't0t0',
      power: 0.4,
      transmission: 0.9,
      rayCount: 5,
      color: [255, 200, 0],
      top: group,
    },
  ],
  totalIntoPupil: 0.4,
};

function expectExplained(readouts: Array<{ explanation: string }>): void {
  expect(readouts.length).toBeGreaterThan(0);
  for (const item of readouts) {
    expect(item.explanation).toMatch(/^[^.]+\.$/);
  }
}

describe('eyeReadouts', () => {
  it('says no light reaches the pupil without an analysis', () => {
    const result = eyeReadouts(null, 3);
    expect(result.readouts.map((item) => item.value)).toEqual(['None']);
    expect(result.rows).toEqual([]);
    expectExplained(result.readouts);
  });

  it('says none for an analysis of another eye', () => {
    expect(eyeReadouts(analysis, 9).readouts[0].value).toBe('None');
  });

  it('lists the light into the pupil and the paths for this eye', () => {
    const result = eyeReadouts(analysis, 3);
    expect(result.readouts.map((item) => item.label)).toEqual([
      'Light into the pupil',
      'Distinct light paths',
    ]);
    expect(result.readouts[0].value).toBe('40.0 % of a source');
    expect(result.rows).toHaveLength(1);
    expectExplained(result.readouts);
  });
});
