import { angleDifference, radians, type SurfaceHit } from './geometry';
import type { Scene, SceneObject } from './scene';
import { followRays, type TracedRay, wavelengthColor } from './trace';

type Eye = Extract<SceneObject, { kind: 'eye' }>;

/** Rays from one emitting point, at one wavelength, that met the same surfaces in the same order. */
export interface EyeGroup {
  sourceId: number;
  pointIndex: number;
  nm: number;
  path: string;
  /** Share of the source's power entering the pupil along this path. */
  power: number;
  rayCount: number;
  /** Mean fraction of each ray's light that survives the path. */
  transmission: number;
  kind: 'real' | 'virtual' | 'infinity' | 'behind';
  /** Least-squares crossing of the group's rays; null at infinity. */
  image: [number, number] | null;
  distance: number;
  /** Direction of the image from the eye's axis, radians. */
  angle: number;
  visible: boolean;
  /** Where the group's outermost rays cross the pupil, for drawing virtual images. */
  low: [number, number] | null;
  high: [number, number] | null;
}

/** All groups of one source that share a path, summed over points and wavelengths. */
export interface EyeRow {
  path: string;
  power: number;
  transmission: number;
  rayCount: number;
  /** Power-weighted mean colour, 0–255 RGB. */
  color: [number, number, number];
  /** The group of this row carrying the most power. */
  top: EyeGroup;
}

export interface EyeAnalysis {
  eyeId: number;
  groups: EyeGroup[];
  rows: EyeRow[];
  totalIntoPupil: number;
}

// Sums for the least-squares crossing point of a group's rays.
interface GroupTally {
  sourceId: number;
  pointIndex: number;
  nm: number;
  path: string;
  rayCount: number;
  power: number;
  intensitySum: number;
  a11: number;
  a12: number;
  a22: number;
  b1: number;
  b2: number;
  directionX: number;
  directionY: number;
  originX: number;
  originY: number;
  pupilX: number;
  pupilY: number;
  low: [number, number] | null;
  high: [number, number] | null;
  lowU: number;
  highU: number;
}

// An image further than this from the eye is treated as at infinity.
const farthestImage = 20000;

function findEye(scene: Scene, eyeId: number): Eye {
  for (const object of scene.objects) {
    if (object.kind === 'eye' && object.id === eyeId) return object;
  }
  throw new Error(`no eye with id ${eyeId}`);
}

/** Groups the rays entering an eye's pupil by path and finds where each group appears to come from. */
export function analyzeEye(scene: Scene, eyeId: number): EyeAnalysis {
  const eye = findEye(scene, eyeId);
  const facingX = Math.cos(radians(eye.angle));
  const facingY = Math.sin(radians(eye.angle));
  const tallies = new Map<string, GroupTally>();
  followRays(scene, 'eye', {
    onSegment() {},
    onDetector() {},
    onEye(ray, surface, hit) {
      const fromTheFront = ray.dx * facingX + ray.dy * facingY < 0;
      if (surface.object.id === eye.id && fromTheFront) recordPupilHit(tallies, ray, hit);
    },
  });

  const groups: EyeGroup[] = [];
  let totalIntoPupil = 0;
  for (const tally of tallies.values()) {
    groups.push(groupFromTally(tally, eye));
    totalIntoPupil += tally.power;
  }
  groups.sort((a, b) => b.power - a.power);
  return { eyeId, groups, rows: rowsFromGroups(groups), totalIntoPupil };
}

function recordPupilHit(tallies: Map<string, GroupTally>, ray: TracedRay, hit: SurfaceHit): void {
  const key = `${ray.sourceId}|${ray.pointIndex}|${ray.nm}|${ray.path}`;
  let tally = tallies.get(key);
  if (!tally) {
    tally = {
      sourceId: ray.sourceId,
      pointIndex: ray.pointIndex,
      nm: ray.nm,
      path: ray.path,
      rayCount: 0,
      power: 0,
      intensitySum: 0,
      a11: 0,
      a12: 0,
      a22: 0,
      b1: 0,
      b2: 0,
      directionX: 0,
      directionY: 0,
      originX: 0,
      originY: 0,
      pupilX: 0,
      pupilY: 0,
      low: null,
      high: null,
      lowU: Infinity,
      highU: -Infinity,
    };
    tallies.set(key, tally);
  }

  const endX = ray.x + ray.dx * hit.t;
  const endY = ray.y + ray.dy * hit.t;
  const weight = ray.weight * ray.intensity;
  // (I - d dᵀ) projects onto the normal of the ray; summing it over the rays gives the normal
  // equations for the point closest to all of them.
  const m11 = 1 - ray.dx * ray.dx;
  const m12 = -ray.dx * ray.dy;
  const m22 = 1 - ray.dy * ray.dy;
  tally.rayCount += 1;
  tally.power += weight;
  tally.intensitySum += ray.intensity;
  tally.a11 += weight * m11;
  tally.a12 += weight * m12;
  tally.a22 += weight * m22;
  tally.b1 += weight * (m11 * endX + m12 * endY);
  tally.b2 += weight * (m12 * endX + m22 * endY);
  tally.directionX += weight * ray.dx;
  tally.directionY += weight * ray.dy;
  tally.originX += weight * ray.x;
  tally.originY += weight * ray.y;
  tally.pupilX += weight * endX;
  tally.pupilY += weight * endY;
  if (hit.u < tally.lowU) {
    tally.lowU = hit.u;
    tally.low = [endX, endY];
  }
  if (hit.u > tally.highU) {
    tally.highU = hit.u;
    tally.high = [endX, endY];
  }
}

/** The image point of a group, extended backwards when the rays diverge. */
function groupFromTally(tally: GroupTally, eye: Eye): EyeGroup {
  const directionLength = Math.hypot(tally.directionX, tally.directionY);
  const dx = tally.directionX / directionLength;
  const dy = tally.directionY / directionLength;
  const pupilMean = [tally.pupilX / tally.power, tally.pupilY / tally.power];
  const originMean = [tally.originX / tally.power, tally.originY / tally.power];
  const determinant = tally.a11 * tally.a22 - tally.a12 * tally.a12;

  let image: [number, number] | null = null;
  let kind: EyeGroup['kind'] = 'infinity';
  // Parallel rays leave the normal equations singular: the image is at infinity.
  if (tally.rayCount >= 2 && determinant > 1e-12 * tally.power * tally.power) {
    image = [
      (tally.a22 * tally.b1 - tally.a12 * tally.b2) / determinant,
      (tally.a11 * tally.b2 - tally.a12 * tally.b1) / determinant,
    ];
    const ahead = (image[0] - pupilMean[0]) * dx + (image[1] - pupilMean[1]) * dy;
    const pastOrigin = (image[0] - originMean[0]) * dx + (image[1] - originMean[1]) * dy;
    if (Math.hypot(image[0] - eye.x, image[1] - eye.y) > farthestImage) image = null;
    else if (ahead > 0) kind = 'behind';
    else kind = pastOrigin > 0 ? 'real' : 'virtual';
  }

  // An image behind the eye or at infinity is seen along the direction the rays arrive from.
  let view = { x: -dx, y: -dy };
  if (image && kind !== 'behind') view = { x: image[0] - eye.x, y: image[1] - eye.y };
  const angle = angleDifference(Math.atan2(view.y, view.x), radians(eye.angle));
  return {
    sourceId: tally.sourceId,
    pointIndex: tally.pointIndex,
    nm: tally.nm,
    path: tally.path,
    power: tally.power,
    rayCount: tally.rayCount,
    transmission: tally.intensitySum / tally.rayCount,
    kind,
    image,
    distance: image ? Math.hypot(image[0] - eye.x, image[1] - eye.y) : Infinity,
    angle,
    visible: Math.abs(angle) <= radians(eye.fieldOfView) / 2,
    low: tally.low,
    high: tally.high,
  };
}

/** Merges groups of the same source and path; `groups` must be sorted by power, highest first. */
function rowsFromGroups(groups: EyeGroup[]): EyeRow[] {
  const sums = new Map<
    string,
    { row: EyeRow; transmitted: number; red: number; green: number; blue: number }
  >();
  for (const group of groups) {
    const key = `${group.sourceId}|${group.path}`;
    let sum = sums.get(key);
    if (!sum) {
      const row: EyeRow = {
        path: group.path,
        power: 0,
        transmission: 0,
        rayCount: 0,
        color: [0, 0, 0],
        top: group,
      };
      sum = { row, transmitted: 0, red: 0, green: 0, blue: 0 };
      sums.set(key, sum);
    }
    const [red, green, blue] = wavelengthColor(group.nm);
    sum.row.power += group.power;
    sum.row.rayCount += group.rayCount;
    sum.transmitted += group.transmission * group.rayCount;
    sum.red += group.power * red;
    sum.green += group.power * green;
    sum.blue += group.power * blue;
  }

  const rows: EyeRow[] = [];
  for (const { row, transmitted, red, green, blue } of sums.values()) {
    rows.push({
      ...row,
      transmission: transmitted / row.rayCount,
      color: [red / row.power, green / row.power, blue / row.power],
    });
  }
  rows.sort((a, b) => b.power - a.power);
  return rows;
}

/** A sentence describing a ray path code such as "t0t1" or "t0i1t0". */
export function pathLabel(path: string): string {
  const count = (letter: string) => path.split(letter).length - 1;
  const refractions = count('t');
  const internal = count('i') + count('x');
  const total = count('x');
  const surface = count('e');
  const mirror = count('m');
  const parts: string[] = [];
  if (refractions) parts.push(`${refractions} refraction${refractions > 1 ? 's' : ''}`);
  if (internal) {
    const totalNote = total ? `, ${total} total` : '';
    parts.push(`${internal} internal reflection${internal > 1 ? 's' : ''}${totalNote}`);
  }
  if (surface) parts.push(`${surface} surface reflection${surface > 1 ? 's' : ''}`);
  if (mirror) parts.push(`${mirror} mirror bounce${mirror > 1 ? 's' : ''}`);
  if (parts.length === 0) return 'Straight from the source';
  const sentence = parts.join(', ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
