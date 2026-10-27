import {
  normalAt,
  type Point,
  type Ray,
  radians,
  type Surface,
  type SurfaceHit,
  surfacesOf,
  toBench,
} from './geometry';
import { refractiveIndex, spectrumOf } from './materials';
import { fieldRanges, type Scene, type SceneObject, type Settings } from './scene';
import { buildSurfaceGrid, nearestHit, noHitLength } from './spatial-grid';

export interface DetectorReading {
  power: number;
  centroid: number;
  rmsWidth: number;
  hits: number;
  bins: {
    intensity: Float64Array;
    red: Float64Array;
    green: Float64Array;
    blue: Float64Array;
  };
}

export interface RayBucket {
  nm: number;
  alpha: number;
  /** Segment end points, flat: [x0, y0, x1, y1, …]. */
  points: number[];
}

export interface TraceResult {
  buckets: Record<string, RayBucket>;
  detectors: Record<number, DetectorReading>;
  segmentCount: number;
}

/** A ray in flight, with the light it carries and the history the eye pass groups by. */
export interface TracedRay extends Ray {
  nm: number;
  /** Drawing opacity before intensity: lower for white light, whose seven colours overlap. */
  alpha: number;
  /** The share of its source's power this ray started with. */
  weight: number;
  /** The fraction of `weight` still carried after reflections and refractions. */
  intensity: number;
  depth: number;
  sourceId: number;
  /** Which of an extended object's emitting points the ray left from; 0 for other sources. */
  pointIndex: number;
  /** One letter and surface index per event: t refraction, e and i partial reflection
   *  from outside and inside, x total internal reflection, m mirror. */
  path: string;
  /** Path length from the source to the start of this ray, in mm. */
  travelled: number;
}

/** The drawing pass draws a few rays; the eye pass emits many more to group by path. */
export type TracePass = 'drawing' | 'eye';

export interface RayHandlers {
  onSegment(ray: TracedRay, length: number): void;
  onDetector(ray: TracedRay, surface: Surface, hit: SurfaceHit): void;
  onEye(ray: TracedRay, surface: Surface, hit: SurfaceHit): void;
}

// Caps on segments and the intensity below which a ray is dropped; Fresnel splitting doubles
// the ray count at every glass hit.
const passLimits = {
  drawing: { maxSegments: 40000, minIntensity: 0.002 },
  eye: { maxSegments: 400000, minIntensity: 1e-5 },
};
const maxDepth = 40;
const emittingPointsPerObject = 9;
const detectorBins = 48;

type Source = Extract<SceneObject, { kind: 'point' | 'beam' | 'object' }>;
type Eye = Extract<SceneObject, { kind: 'eye' }>;

/** The eye's pupil diameter and the distance from a source to the farthest object, in mm. */
export interface PupilAim {
  pupil: number;
  reach: number;
}

/**
 * The rays a source sends out; empty for objects that do not emit. With `aim`, the eye pass
 * spaces a cone's rays to the pupil's size instead of a ray every 0.05°.
 */
export function emitRays(object: SceneObject, pass: TracePass, aim?: PupilAim): TracedRay[] {
  if (object.kind !== 'point' && object.kind !== 'beam' && object.kind !== 'object') return [];
  const wavelengths = spectrumOf(object.spectrum);
  const alpha = wavelengths.length > 1 ? 0.42 : 0.85;
  const points = emittingPoints(object, pass);
  const count = raysPerPoint(object, pass, aim);
  const weight = 1 / (count * wavelengths.length * points.length);

  const rays: TracedRay[] = [];
  for (const point of points) {
    for (const nm of wavelengths) {
      for (let i = 0; i < count; i += 1) {
        rays.push({
          ...startOfRay(object, point, i, count),
          nm,
          alpha,
          weight,
          intensity: 1,
          depth: 0,
          sourceId: object.id,
          pointIndex: point.index,
          path: '',
          travelled: 0,
        });
      }
    }
  }
  return rays;
}

/** Ray i of `count`: spread across a beam's width, or across a cone's angle (a full circle at 360°). */
function startOfRay(source: Source, point: Point, i: number, count: number): Ray {
  const angle = radians(source.angle);
  const fraction = count === 1 ? 0 : i / (count - 1) - 0.5;
  if (source.kind === 'beam') {
    const offset = source.width * fraction;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    return { x: point.x - dy * offset, y: point.y + dx * offset, dx, dy };
  }
  const direction =
    source.cone >= 360
      ? angle + (2 * Math.PI * i) / count
      : angle + radians(source.cone) * fraction;
  return { x: point.x, y: point.y, dx: Math.cos(direction), dy: Math.sin(direction) };
}

/** An extended object emits from points along its height: both ends when drawing, all nine for the eye. */
function emittingPoints(source: Source, pass: TracePass): Array<Point & { index: number }> {
  if (source.kind !== 'object') return [{ x: source.x, y: source.y, index: 0 }];
  const points = [];
  const last = emittingPointsPerObject - 1;
  for (let index = 0; index <= last; index += 1) {
    if (pass === 'drawing' && index !== 0 && index !== last) continue;
    points.push({ ...toBench(source, 0, (-source.height * index) / last), index });
  }
  return points;
}

function raysPerPoint(source: Source, pass: TracePass, aim?: PupilAim): number {
  const asked = Math.min(fieldRanges[source.kind].rays.max, Math.max(1, Math.round(source.rays)));
  if (pass === 'drawing') return asked;
  // The eye pass samples densely: a ray every 0.08 mm of beam. A cone gets a ray every 0.05°
  // or, aimed at a pupil, 24 rays across the angle the pupil spans at the scene's farthest
  // distance, never finer than 0.05° nor coarser than 1°.
  if (source.kind === 'beam')
    return Math.min(800, Math.max(asked, Math.round(source.width / 0.08)));
  let spacingDegrees = 0.05;
  if (aim) {
    const pupilDegrees = (Math.atan(aim.pupil / aim.reach) * 180) / Math.PI;
    spacingDegrees = Math.min(1, Math.max(0.05, pupilDegrees / 24));
  }
  return Math.min(1000, Math.max(asked, Math.round(Math.min(360, source.cone) / spacingDegrees)));
}

/**
 * How the eye pass aims a source's rays at `eye`; none without an eye, and none when a curved
 * mirror narrows the bundle that reaches the pupil below what the pupil's size suggests.
 */
function pupilAim(scene: Scene, source: SceneObject, eye: Eye | undefined): PupilAim | undefined {
  if (!eye) return undefined;
  let reach = 0;
  for (const object of scene.objects) {
    if (object.kind === 'arcMirror') return undefined;
    reach = Math.max(reach, Math.hypot(object.x - source.x, object.y - source.y));
  }
  return { pupil: eye.pupil, reach };
}

/**
 * Follows every ray of every source until it leaves, is stopped, or fades below the pass's
 * intensity floor. The eye pass aims its rays at `eye` when given. Returns the number of
 * segments traced.
 */
export function followRays(
  scene: Scene,
  pass: TracePass,
  handlers: RayHandlers,
  eye?: Eye,
): number {
  const { maxSegments, minIntensity } = passLimits[pass];
  const grid = buildSurfaceGrid(scene.objects.flatMap(surfacesOf));
  const stack: TracedRay[] = [];
  for (const object of scene.objects) {
    // Every ray costs at least one segment, so a source emitted past the cap is never traced.
    if (stack.length >= maxSegments) break;
    for (const ray of emitRays(object, pass, pupilAim(scene, object, eye))) stack.push(ray);
  }

  let segmentCount = 0;
  while (segmentCount < maxSegments) {
    const ray = stack.pop();
    if (!ray) break;
    const nearest = nearestHit(grid, ray);
    handlers.onSegment(ray, nearest ? nearest.hit.t : noHitLength);
    segmentCount += 1;
    if (!nearest || ray.depth > maxDepth) continue;

    const { surface, hit, index } = nearest;
    if (surface.role === 'eye') {
      handlers.onEye(ray, surface, hit);
      continue;
    }
    if (surface.role === 'detector') {
      handlers.onDetector(ray, surface, hit);
      continue;
    }
    if (surface.role === 'blocker') continue;

    const children =
      surface.role === 'mirror'
        ? [mirrorReflection(ray, surface, hit.t, index)]
        : glassInteraction(ray, surface, hit.t, index, scene.settings);
    for (const child of children) {
      if (child.intensity >= minIntensity) stack.push(child);
    }
  }
  return segmentCount;
}

/** The ray that carries on from where `parent` met a surface after `length` mm. */
function continueRay(
  parent: TracedRay,
  length: number,
  dx: number,
  dy: number,
  intensity: number,
  code: string,
): TracedRay {
  const directionLength = Math.hypot(dx, dy);
  return {
    ...parent,
    x: parent.x + parent.dx * length,
    y: parent.y + parent.dy * length,
    dx: dx / directionLength,
    dy: dy / directionLength,
    intensity,
    depth: parent.depth + 1,
    path: parent.path + code,
    travelled: parent.travelled + length,
  };
}

function mirrorReflection(ray: TracedRay, surface: Surface, length: number, index: number) {
  const normal = normalAt(surface, ray.x + ray.dx * length, ray.y + ray.dy * length);
  const along = ray.dx * normal.x + ray.dy * normal.y;
  const dx = ray.dx - 2 * along * normal.x;
  const dy = ray.dy - 2 * along * normal.y;
  return continueRay(ray, length, dx, dy, ray.intensity, `m${index}`);
}

/** Snell refraction with total internal reflection, split by Fresnel reflectance when enabled. */
function glassInteraction(
  ray: TracedRay,
  surface: Surface,
  length: number,
  index: number,
  settings: Settings,
): TracedRay[] {
  const glass = surface.object;
  if (glass.kind !== 'lens' && glass.kind !== 'prism' && glass.kind !== 'ball') {
    throw new Error(`a ${glass.kind} has no glass surface`);
  }
  const glassIndex = refractiveIndex(glass.material, ray.nm);
  let normal = normalAt(surface, ray.x + ray.dx * length, ray.y + ray.dy * length);
  let cosIncidence = -(ray.dx * normal.x + ray.dy * normal.y);
  let n1 = 1;
  let n2 = glassIndex;
  // Leaving the glass: the ray runs along the outward normal.
  if (cosIncidence < 0) {
    cosIncidence = -cosIncidence;
    normal = { x: -normal.x, y: -normal.y };
    n1 = glassIndex;
    n2 = 1;
  }
  const reflectedDx = ray.dx + 2 * cosIncidence * normal.x;
  const reflectedDy = ray.dy + 2 * cosIncidence * normal.y;
  const eta = n1 / n2;
  const cosTransmittedSquared = 1 - eta * eta * (1 - cosIncidence * cosIncidence);
  if (cosTransmittedSquared <= 0) {
    return [continueRay(ray, length, reflectedDx, reflectedDy, ray.intensity, `x${index}`)];
  }

  const cosTransmitted = Math.sqrt(cosTransmittedSquared);
  const transmittedDx = eta * ray.dx + (eta * cosIncidence - cosTransmitted) * normal.x;
  const transmittedDy = eta * ray.dy + (eta * cosIncidence - cosTransmitted) * normal.y;
  const transmitCode = `t${index}`;
  if (!settings.partialReflections) {
    return [continueRay(ray, length, transmittedDx, transmittedDy, ray.intensity, transmitCode)];
  }
  const reflectance = reflectanceFor(settings.polarization, n1, n2, cosIncidence);
  const reflectCode = `${n1 > n2 ? 'i' : 'e'}${index}`;
  return [
    continueRay(
      ray,
      length,
      transmittedDx,
      transmittedDy,
      ray.intensity * (1 - reflectance),
      transmitCode,
    ),
    continueRay(ray, length, reflectedDx, reflectedDy, ray.intensity * reflectance, reflectCode),
  ];
}

function reflectanceFor(
  polarization: Settings['polarization'],
  n1: number,
  n2: number,
  cosIncidence: number,
): number {
  const { rs2, rp2 } = fresnelReflectance(n1, n2, cosIncidence);
  if (polarization === 's') return rs2;
  if (polarization === 'p') return rp2;
  return (rs2 + rp2) / 2;
}

/** Fresnel power reflectance for s and p polarization at an interface from n1 into n2. */
export function fresnelReflectance(
  n1: number,
  n2: number,
  cosIncidence: number,
): { rs2: number; rp2: number } {
  const eta = n1 / n2;
  const cosTransmittedSquared = 1 - eta * eta * (1 - cosIncidence * cosIncidence);
  if (cosTransmittedSquared <= 0) return { rs2: 1, rp2: 1 };
  const cosTransmitted = Math.sqrt(cosTransmittedSquared);
  const rs = (n1 * cosIncidence - n2 * cosTransmitted) / (n1 * cosIncidence + n2 * cosTransmitted);
  const rp = (n2 * cosIncidence - n1 * cosTransmitted) / (n2 * cosIncidence + n1 * cosTransmitted);
  return { rs2: rs * rs, rp2: rp * rp };
}

/** Display colour of a wavelength as 0–255 RGB, dimmed towards the ends of the visible range. */
export function wavelengthColor(nm: number): [number, number, number] {
  let red = 0;
  let green = 0;
  let blue = 0;
  if (nm < 440) {
    red = (440 - nm) / 60;
    blue = 1;
  } else if (nm < 490) {
    green = (nm - 440) / 50;
    blue = 1;
  } else if (nm < 510) {
    green = 1;
    blue = (510 - nm) / 20;
  } else if (nm < 580) {
    red = (nm - 510) / 70;
    green = 1;
  } else if (nm < 645) {
    red = 1;
    green = (645 - nm) / 65;
  } else {
    red = 1;
  }
  let fade = 1;
  if (nm < 420) fade = 0.3 + (0.7 * (nm - 380)) / 40;
  if (nm > 700) fade = 0.3 + (0.7 * (780 - nm)) / 80;
  const channel = (value: number) => Math.round(255 * Math.max(0, value * fade) ** 0.8);
  return [channel(red), channel(green), channel(blue)];
}

interface DetectorTally {
  length: number;
  reading: DetectorReading;
  firstMoment: number;
  secondMoment: number;
}

function emptyTally(length: number): DetectorTally {
  return {
    length,
    reading: {
      power: 0,
      centroid: 0,
      rmsWidth: 0,
      hits: 0,
      bins: {
        intensity: new Float64Array(detectorBins),
        red: new Float64Array(detectorBins),
        green: new Float64Array(detectorBins),
        blue: new Float64Array(detectorBins),
      },
    },
    firstMoment: 0,
    secondMoment: 0,
  };
}

/** Traces every source in the scene through its optics. */
export function trace(scene: Scene): TraceResult {
  const buckets: Record<string, RayBucket> = {};
  const tallies = new Map<number, DetectorTally>();
  for (const object of scene.objects) {
    if (object.kind === 'detector') tallies.set(object.id, emptyTally(object.length));
  }

  const segmentCount = followRays(scene, 'drawing', {
    onSegment(ray, length) {
      // Opacity is quantised to 32 levels so segments batch into a few draw calls.
      const level = Math.min(32, Math.max(1, Math.round(ray.alpha * ray.intensity * 32)));
      const key = `${ray.nm}|${level}`;
      if (!buckets[key]) buckets[key] = { nm: ray.nm, alpha: level / 32, points: [] };
      buckets[key].points.push(ray.x, ray.y, ray.x + ray.dx * length, ray.y + ray.dy * length);
    },
    onDetector(ray, surface, hit) {
      const tally = tallies.get(surface.object.id);
      if (!tally) throw new Error(`detector ${surface.object.id} has no tally`);
      addDetectorHit(tally, ray, hit, scene.settings.brightness);
    },
    onEye() {},
  });

  const detectors: Record<number, DetectorReading> = {};
  for (const [id, tally] of tallies) detectors[id] = finishedReading(tally);
  return { buckets, detectors, segmentCount };
}

function addDetectorHit(
  tally: DetectorTally,
  ray: TracedRay,
  hit: SurfaceHit,
  brightness: Settings['brightness'],
): void {
  let power = ray.weight * ray.intensity;
  if (brightness === '3d') power *= squareToLineShare(tally.length, ray.travelled + hit.t);
  const position = (hit.u - 0.5) * tally.length;
  const bin = Math.min(detectorBins - 1, Math.floor(hit.u * detectorBins));
  const [red, green, blue] = wavelengthColor(ray.nm);
  const { reading } = tally;
  reading.power += power;
  reading.hits += 1;
  tally.firstMoment += power * position;
  tally.secondMoment += power * position * position;
  reading.bins.intensity[bin] += power;
  reading.bins.red[bin] += power * red;
  reading.bins.green[bin] += power * green;
  reading.bins.blue[bin] += power * blue;
}

/**
 * The share of a point source's light a square sensor of side `length` at `distance` catches in
 * 3D, divided by the share a line sensor of that length catches in 2D. With a = length / (2r)
 * the square subtends 4 asin(a² / (1 + a²)) of 4π and the line 2 atan(a) of 2π. The ratio is
 * about a far away and never exceeds 1, so a near sensor cannot read more than the source emits.
 */
function squareToLineShare(length: number, distance: number): number {
  const a = length / (2 * distance);
  return Math.asin((a * a) / (1 + a * a)) / Math.atan(a);
}

function finishedReading(tally: DetectorTally): DetectorReading {
  const { reading } = tally;
  if (reading.power === 0) return reading;
  const centroid = tally.firstMoment / reading.power;
  const variance = tally.secondMoment / reading.power - centroid * centroid;
  // Rounding can push the variance of a one-point spot just below zero.
  return { ...reading, centroid, rmsWidth: Math.sqrt(Math.max(0, variance)) };
}
