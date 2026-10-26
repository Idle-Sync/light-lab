import { analyzeEye, type EyeAnalysis, type EyeGroup, examples } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { keptEyeRows } from './eye-rows';

function group(pointIndex: number, path: string, power: number): EyeGroup {
  return {
    sourceId: 1,
    pointIndex,
    nm: 589.3,
    path,
    power,
    rayCount: 5,
    transmission: 0.9,
    kind: 'virtual',
    image: [0, 0],
    distance: 100,
    angle: 0,
    visible: true,
    low: null,
    high: null,
  };
}

describe('keptEyeRows', () => {
  it('measures the threshold against the strongest group, not the strongest row', () => {
    const strong: EyeGroup[] = [];
    for (let pointIndex = 0; pointIndex < 9; pointIndex += 1) {
      strong.push(group(pointIndex, 't0t0', 0.1));
    }
    const faint = group(0, 't0e0t0', 5e-5);
    const analysis: EyeAnalysis = {
      eyeId: 3,
      groups: [...strong, faint],
      rows: [
        {
          path: 't0t0',
          power: 0.9,
          transmission: 0.9,
          rayCount: 45,
          color: [255, 200, 0],
          top: strong[0],
        },
        {
          path: 't0e0t0',
          power: 5e-5,
          transmission: 0.9,
          rayCount: 5,
          color: [255, 200, 0],
          top: faint,
        },
      ],
      totalIntoPupil: 0.90005,
    };
    expect(keptEyeRows(analysis).map((row) => row.path)).toEqual(['t0t0', 't0e0t0']);
  });

  it('keeps as many ball rows as the prototype eye engine does', () => {
    // node reference/checks/verify.mjs's loader, ball example: rows with P >= list[0].P * 1e-4.
    const prototypeKeptRows = 3;
    expect(keptEyeRows(analyzeEye(examples.ball, 3))).toHaveLength(prototypeKeptRows);
  });

  it('keeps nothing when no light reaches the pupil', () => {
    expect(keptEyeRows({ eyeId: 3, groups: [], rows: [], totalIntoPupil: 0 })).toEqual([]);
  });
});
