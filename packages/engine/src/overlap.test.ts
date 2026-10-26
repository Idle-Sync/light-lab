import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { overlappingGlass } from './overlap';
import { parseScene } from './scene';

describe('overlappingGlass', () => {
  it('reports two balls whose centres are closer than their radii add up to', () => {
    const scene = parseScene({
      v: 1,
      objects: [
        { kind: 'ball', id: 1, x: 0, y: 0, angle: 0, diameter: 30, material: 'bk7' },
        { kind: 'ball', id: 2, x: 10, y: 0, angle: 0, diameter: 30, material: 'bk7' },
      ],
    });
    expect(overlappingGlass(scene)).toEqual([[1, 2]]);
  });

  it('reports nothing for the example scenes', () => {
    for (const scene of Object.values(examples)) expect(overlappingGlass(scene)).toEqual([]);
  });
});
