import { defaultSettings, type Scene, type SceneObject } from './scene';
import { noHitLength } from './spatial-grid';
import { followRays, type TracedRay } from './trace';

// Close enough to the axis that spherical aberration is negligible, far enough that the
// bend stays well above rounding error.
const paraxialHeight = 0.1;

/**
 * Effective focal length found by tracing a paraxial ray through the object, in mm:
 * positive when converging, negative when diverging, null when the object has none.
 */
export function measuredFocalLength(object: SceneObject, nm: number): number | null {
  if (object.kind !== 'lens' && object.kind !== 'arcMirror' && object.kind !== 'ball') return null;
  // In the object's own frame its axis is the x axis and its front faces +x.
  const scene: Scene = {
    v: 2,
    settings: { ...defaultSettings, partialReflections: false },
    objects: [
      { ...object, x: 0, y: 0, angle: 0 },
      {
        kind: 'beam',
        id: -1,
        x: 2000,
        y: paraxialHeight,
        angle: 180,
        width: 0,
        rays: 1,
        spectrum: nm,
      },
    ],
  };
  // With partial reflections off there is one chain of rays, so one ray leaves.
  const leavingRays: TracedRay[] = [];
  followRays(scene, 'drawing', {
    onSegment(ray, length) {
      if (length === noHitLength) leavingRays.push(ray);
    },
    onDetector() {},
    onEye() {},
  });
  const leaving = leavingRays[0];
  if (!leaving || leaving.depth === 0 || leaving.dy === 0) return null;
  // The leaving ray crosses the axis f/|dx| further on per unit of height, measured from the
  // principal plane: f = h / tan(angle to the axis).
  return (-paraxialHeight * Math.abs(leaving.dx)) / leaving.dy;
}
