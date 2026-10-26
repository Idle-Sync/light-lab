import type { Ray, Surface, SurfaceHit } from './geometry';

export interface SurfaceGrid {
  surfaces: Surface[];
}

/** Buckets surfaces into grid cells so a ray only tests the surfaces along its path. */
export function buildSurfaceGrid(surfaces: Surface[]): SurfaceGrid {
  return { surfaces };
}

/** The closest surface a ray hits, or null when it leaves the bench. */
export function nearestHit(
  _grid: SurfaceGrid,
  _ray: Ray,
): { hit: SurfaceHit; surface: Surface } | null {
  return null;
}
