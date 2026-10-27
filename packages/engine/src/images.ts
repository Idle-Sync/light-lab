import { type Point, toBench } from './geometry';
import type { Scene, SceneObject } from './scene';
import { followRays, type TracedRay } from './trace';

/** Most image arrows one scene shows. */
export const maxImageArrows = 80;
/** Most extended object and optic pairs one scene traces for images. */
export const maxObjectOpticPairs = 100;

// An image farther than this from the last surface is treated as at infinity, as in eye.ts.
const farthestImage = 20000;
// A narrow cone of a few rays per object end finds the image without the main trace's rays.
const raysPerEnd = 5;
const coneDegrees = 1;
// The helium d line, for white objects.
const whiteLightNm = 587.6;
const baseSourceId = -1;
const tipSourceId = -2;

/** The image an optic forms of an extended object, along one light path. */
export interface ImageArrow {
  sourceId: number;
  path: string;
  kind: 'real' | 'virtual';
  /** Images of the object's two ends. */
  base: Point;
  tip: Point;
  /** Where the rays forming each end last left a surface; extension lines start here. */
  baseFrom: Point;
  tipFrom: Point;
  /** Root mean square distance of the rays from their meeting points, in mm. */
  blur: number;
  /** Image height over object height; negative when the image is upside down. */
  magnification: number;
}

type ExtendedObject = Extract<SceneObject, { kind: 'object' }>;

/** Where one end's rays along one path meet, or seem to spread from. */
interface EndImage {
  point: Point;
  from: Point;
  /** Mean direction of the rays leaving the last surface. */
  direction: Point;
  kind: 'real' | 'virtual';
  squaredDistanceSum: number;
  rayCount: number;
}

function isOptic(object: SceneObject): boolean {
  return (
    object.kind === 'mirror' ||
    object.kind === 'arcMirror' ||
    object.kind === 'lens' ||
    object.kind === 'ball'
  );
}

function isSource(object: SceneObject): boolean {
  return object.kind === 'point' || object.kind === 'beam' || object.kind === 'object';
}

/**
 * Image arrows of every extended object through every mirror, curved mirror, lens and ball,
 * one per object and light path. Pairs are taken objects first, optics second, in scene order,
 * until `maxObjectOpticPairs` pairs or `maxImageArrows` arrows. Empty when the scene hides images.
 */
export function imagesOf(scene: Scene): ImageArrow[] {
  if (!scene.settings.showImages) return [];
  const extendedObjects: ExtendedObject[] = [];
  for (const object of scene.objects) {
    if (object.kind === 'object') extendedObjects.push(object);
  }
  const optics = scene.objects.filter(isOptic);
  const opticalBench = scene.objects.filter((object) => !isSource(object));

  const arrows: ImageArrow[] = [];
  const imagedPaths = new Set<string>();
  let pairCount = 0;
  for (const source of extendedObjects) {
    for (const optic of optics) {
      if (pairCount >= maxObjectOpticPairs || arrows.length >= maxImageArrows) return arrows;
      pairCount += 1;
      for (const arrow of arrowsThrough(scene, opticalBench, source, optic)) {
        if (arrows.length >= maxImageArrows) return arrows;
        const key = `${arrow.sourceId}|${arrow.path}`;
        if (imagedPaths.has(key)) continue;
        imagedPaths.add(key);
        arrows.push(arrow);
      }
    }
  }
  return arrows;
}

/** A point source at `end` sending a narrow cone of rays at `target`. */
function aimedSource(id: number, end: Point, target: Point, nm: number): SceneObject {
  const angle = (Math.atan2(target.y - end.y, target.x - end.x) * 180) / Math.PI;
  return {
    kind: 'point',
    id,
    x: end.x,
    y: end.y,
    angle,
    cone: coneDegrees,
    rays: raysPerEnd,
    spectrum: nm,
  };
}

/** The arrows formed by light from both ends of `source` aimed at the centre of `optic`. */
function arrowsThrough(
  scene: Scene,
  opticalBench: SceneObject[],
  source: ExtendedObject,
  optic: SceneObject,
): ImageArrow[] {
  const nm = source.spectrum === 'white' ? whiteLightNm : source.spectrum;
  const base = { x: source.x, y: source.y };
  // The tip sits `height` along the object's local -y, where trace.ts emits from it.
  const tip = toBench(source, 0, -source.height);
  const traced: Scene = {
    ...scene,
    settings: { ...scene.settings, partialReflections: false },
    objects: [
      ...opticalBench,
      aimedSource(baseSourceId, base, optic, nm),
      aimedSource(tipSourceId, tip, optic, nm),
    ],
  };
  const { baseRays, tipRays } = airRaysByPath(traced);

  const chiefDirection = { x: optic.x - base.x, y: optic.y - base.y };
  const objectVector = { x: tip.x - base.x, y: tip.y - base.y };
  const arrows: ImageArrow[] = [];
  for (const [path, rays] of baseRays) {
    const tipGroup = tipRays.get(path);
    if (!tipGroup) continue;
    const baseImage = endImage(rays);
    const tipImage = endImage(tipGroup);
    if (!baseImage || !tipImage || baseImage.kind !== tipImage.kind) continue;
    const imageVector = {
      x: tipImage.point.x - baseImage.point.x,
      y: tipImage.point.y - baseImage.point.y,
    };
    const orientation =
      cross(chiefDirection, objectVector) *
      cross(baseImage.direction, imageVector) *
      reflectionSign(path);
    const size = Math.hypot(imageVector.x, imageVector.y) / source.height;
    const rayCount = baseImage.rayCount + tipImage.rayCount;
    const squaredSpread = (baseImage.squaredDistanceSum + tipImage.squaredDistanceSum) / rayCount;
    arrows.push({
      sourceId: source.id,
      path,
      kind: baseImage.kind,
      base: baseImage.point,
      tip: tipImage.point,
      baseFrom: baseImage.from,
      tipFrom: tipImage.from,
      // Rays meeting exactly can round the spread just below zero.
      blur: Math.sqrt(Math.max(0, squaredSpread)),
      magnification: orientation < 0 ? -size : size,
    });
  }
  return arrows;
}

/** The segments outside glass that have met a surface, per end and by path. */
function airRaysByPath(traced: Scene) {
  const baseRays = new Map<string, TracedRay[]>();
  const tipRays = new Map<string, TracedRay[]>();
  followRays(traced, 'drawing', {
    onSegment(ray) {
      if (ray.path === '' || !isInAir(ray.path)) return;
      const groups = ray.sourceId === baseSourceId ? baseRays : tipRays;
      const group = groups.get(ray.path) ?? [];
      group.push(ray);
      groups.set(ray.path, group);
    },
    onDetector() {},
    onEye() {},
  });
  return { baseRays, tipRays };
}

/** Whether a ray with this path is outside glass: every refraction into glass has one out. */
function isInAir(path: string): boolean {
  return countOf(path, 't') % 2 === 0;
}

function countOf(path: string, letter: string): number {
  return path.split(letter).length - 1;
}

/** Each mirror bounce and total internal reflection turns the image over once. */
function reflectionSign(path: string): number {
  const reflections = countOf(path, 'm') + countOf(path, 'x');
  return reflections % 2 === 0 ? 1 : -1;
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

/**
 * The least-squares meeting point of rays leaving the last surface, extended backwards when
 * they spread. Null for fewer than two rays, parallel rays, or a point past `farthestImage`.
 */
function endImage(rays: TracedRay[]): EndImage | null {
  if (rays.length < 2) return null;
  let a11 = 0;
  let a12 = 0;
  let a22 = 0;
  let b1 = 0;
  let b2 = 0;
  let directionX = 0;
  let directionY = 0;
  let fromX = 0;
  let fromY = 0;
  for (const ray of rays) {
    // (I - d dᵀ) projects onto the normal of the ray; summing it over the rays gives the normal
    // equations for the point closest to all of them, as the eye analysis does.
    const m11 = 1 - ray.dx * ray.dx;
    const m12 = -ray.dx * ray.dy;
    const m22 = 1 - ray.dy * ray.dy;
    a11 += m11;
    a12 += m12;
    a22 += m22;
    b1 += m11 * ray.x + m12 * ray.y;
    b2 += m12 * ray.x + m22 * ray.y;
    directionX += ray.dx;
    directionY += ray.dy;
    fromX += ray.x;
    fromY += ray.y;
  }
  const count = rays.length;
  const determinant = a11 * a22 - a12 * a12;
  if (determinant <= 1e-12 * count * count) return null;

  const point = {
    x: (a22 * b1 - a12 * b2) / determinant,
    y: (a11 * b2 - a12 * b1) / determinant,
  };
  const from = { x: fromX / count, y: fromY / count };
  if (Math.hypot(point.x - from.x, point.y - from.y) > farthestImage) return null;
  const directionLength = Math.hypot(directionX, directionY);
  const direction = { x: directionX / directionLength, y: directionY / directionLength };
  const ahead = (point.x - from.x) * direction.x + (point.y - from.y) * direction.y;
  return {
    point,
    from,
    direction,
    kind: ahead > 0 ? 'real' : 'virtual',
    squaredDistanceSum: squaredDistanceSum(rays, point),
    rayCount: count,
  };
}

/** Sum over the rays of the squared distance from `point` to each ray's line. */
function squaredDistanceSum(rays: TracedRay[], point: Point): number {
  let sum = 0;
  for (const ray of rays) {
    const offsetX = point.x - ray.x;
    const offsetY = point.y - ray.y;
    const along = offsetX * ray.dx + offsetY * ray.dy;
    sum += offsetX * offsetX + offsetY * offsetY - along * along;
  }
  return sum;
}

/** A sentence such as "Real image, upside down, 2× larger". */
export function imageLabel(arrow: ImageArrow): string {
  const kind = arrow.kind === 'real' ? 'Real image' : 'Virtual image';
  const orientation = arrow.magnification < 0 ? 'upside down' : 'upright';
  return `${kind}, ${orientation}, ${sizeWords(Math.abs(arrow.magnification))}`;
}

function sizeWords(size: number): string {
  if (Math.abs(size - 1) <= 0.05) return 'same size';
  if (size > 1) return `${roundedRatio(size)}× larger`;
  return `${roundedRatio(1 / size)}× smaller`;
}

/** A ratio to one decimal, without a trailing ".0". */
function roundedRatio(ratio: number): string {
  return String(Number(ratio.toFixed(1)));
}
