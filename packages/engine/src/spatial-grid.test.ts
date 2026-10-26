import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { hitSurface, type Ray, type Surface, surfacesOf } from './geometry';
import { buildSurfaceGrid, nearestHit, noHitLength } from './spatial-grid';

/** Deterministic pseudo-random numbers in [0, 1), so a failing ray can be reproduced. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function bruteForceHit(surfaces: Surface[], ray: Ray): { t: number; index: number } | null {
  let best: { t: number; index: number } | null = null;
  for (let index = 0; index < surfaces.length; index += 1) {
    const hit = hitSurface(surfaces[index], ray);
    if (hit && hit.t < (best ? best.t : noHitLength)) best = { t: hit.t, index };
  }
  return best;
}

describe('nearestHit', () => {
  it('finds the same hit as testing every surface, for 1,000 random rays over the bench', () => {
    const surfaces = examples.bench.objects.flatMap(surfacesOf);
    const grid = buildSurfaceGrid(surfaces);
    const random = seededRandom(7);
    let hits = 0;
    for (let i = 0; i < 1000; i += 1) {
      const direction = random() * 2 * Math.PI;
      const ray: Ray = {
        x: -350 + 700 * random(),
        y: -250 + 500 * random(),
        dx: Math.cos(direction),
        dy: Math.sin(direction),
      };
      const expected = bruteForceHit(surfaces, ray);
      const found = nearestHit(grid, ray);
      expect(found && { t: found.hit.t, index: found.index }).toEqual(expected);
      if (expected) hits += 1;
    }
    // Enough rays hit something for the comparison to mean anything.
    expect(hits).toBeGreaterThan(100);
  });
});
