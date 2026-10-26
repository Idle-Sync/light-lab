import { lensThickness } from './materials';
import type { Scene, SceneObject } from './scene';

/** Radius of a circle around the object's centre that contains all of its glass, or null if it has none. */
function glassRadius(object: SceneObject): number | null {
  if (object.kind === 'ball') return object.diameter / 2;
  // 0.6 · side is just over the distance from the centre to a corner, side / √3.
  if (object.kind === 'prism') return object.side * 0.6;
  if (object.kind !== 'lens') return null;
  // The lens fits in a box as wide as its diameter and as deep as its centre thickness.
  return Math.hypot(object.diameter / 2, lensThickness(object) / 2);
}

/**
 * Pairs of glass object ids whose bounding circles overlap, in scene order. The circles are
 * larger than the glass, so a reported pair may only come close; a pair not reported never touches.
 */
export function overlappingGlass(scene: Scene): Array<[number, number]> {
  const glass: Array<{ id: number; x: number; y: number; radius: number }> = [];
  for (const object of scene.objects) {
    const radius = glassRadius(object);
    if (radius !== null) glass.push({ id: object.id, x: object.x, y: object.y, radius });
  }
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < glass.length; i += 1) {
    for (let j = i + 1; j < glass.length; j += 1) {
      const apart = Math.hypot(glass[j].x - glass[i].x, glass[j].y - glass[i].y);
      if (apart < glass[i].radius + glass[j].radius) pairs.push([glass[i].id, glass[j].id]);
    }
  }
  return pairs;
}
