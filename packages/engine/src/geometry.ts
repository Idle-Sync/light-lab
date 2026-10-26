import type { SceneObject } from './scene';

export interface Ray {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface Surface {
  object: SceneObject;
}

export interface SurfaceHit {
  t: number;
}

/** The segments and arcs that make up an object's optical surfaces. */
export function surfacesOf(_object: SceneObject): Surface[] {
  return [];
}

/** Where a ray first meets a surface, or null when it misses. */
export function hitSurface(_surface: Surface, _ray: Ray): SurfaceHit | null {
  return null;
}
