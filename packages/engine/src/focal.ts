import { type Point, toBench } from './geometry';
import { defaultSettings, type Scene, type SceneObject } from './scene';
import { noHitLength } from './spatial-grid';
import { followRays, type TracedRay } from './trace';

// Close enough to the axis that spherical aberration is negligible, far enough that the
// bend stays well above rounding error.
const paraxialHeight = 0.1;

type Side = 'front' | 'back';

/**
 * The ray that leaves `object` after a paraxial ray arrives along its axis from `side`, in the
 * object's own frame: its axis is the x axis and its front faces +x. Null when none leaves.
 */
function leavingParaxialRay(object: SceneObject, nm: number, side: Side): TracedRay | null {
  const fromFront = side === 'front';
  const scene: Scene = {
    v: 3,
    settings: { ...defaultSettings, partialReflections: false },
    objects: [
      { ...object, x: 0, y: 0, angle: 0 },
      {
        kind: 'beam',
        id: -1,
        x: fromFront ? 2000 : -2000,
        y: paraxialHeight,
        angle: fromFront ? 180 : 0,
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
  return leaving;
}

function hasFocus(object: SceneObject): boolean {
  return object.kind === 'lens' || object.kind === 'arcMirror' || object.kind === 'ball';
}

/**
 * Effective focal length found by tracing a paraxial ray through the object, in mm:
 * positive when converging, negative when diverging, null when the object has none.
 */
export function measuredFocalLength(object: SceneObject, nm: number): number | null {
  if (!hasFocus(object)) return null;
  const leaving = leavingParaxialRay(object, nm, 'front');
  if (!leaving) return null;
  // The leaving ray crosses the axis f/|dx| further on per unit of height, measured from the
  // principal plane: f = h / tan(angle to the axis).
  return (-paraxialHeight * Math.abs(leaving.dx)) / leaving.dy;
}

/**
 * Bench points where light arriving along the axis comes to a focus, or seems to spread from
 * when the object diverges it: one per side for lenses and balls, the front one for mirrors.
 */
export function focalPoints(object: SceneObject, nm: number): Point[] {
  if (!hasFocus(object)) return [];
  const sides: Side[] = object.kind === 'arcMirror' ? ['front'] : ['front', 'back'];
  const points: Point[] = [];
  for (const side of sides) {
    const leaving = leavingParaxialRay(object, nm, side);
    if (!leaving) continue;
    const axisCrossing = leaving.x - (leaving.y * leaving.dx) / leaving.dy;
    points.push(toBench(object, axisCrossing, 0));
  }
  return points;
}
