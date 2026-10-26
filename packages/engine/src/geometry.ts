import { lensThickness } from './materials';
import type { SceneObject } from './scene';

export interface Point {
  x: number;
  y: number;
}

/** A ray from (x, y) along the unit direction (dx, dy). */
export interface Ray {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/** What a surface does to a ray that meets it. */
export type SurfaceRole = 'mirror' | 'detector' | 'blocker' | 'glass' | 'eye';

export interface SegmentSurface {
  shape: 'segment';
  start: Point;
  end: Point;
  /** Outward normal of a glass face; null for surfaces that have no inside. */
  normal: Point | null;
  role: SurfaceRole;
  object: SceneObject;
}

export interface ArcSurface {
  shape: 'arc';
  centre: Point;
  radius: number;
  /** Direction from the centre to the middle of the arc, radians. */
  middleAngle: number;
  /** Half the angle the arc spans, radians; π for a full circle. */
  halfAngle: number;
  role: SurfaceRole;
  object: SceneObject;
}

export type Surface = SegmentSurface | ArcSurface;

export interface SurfaceHit {
  /** Distance along the ray. */
  t: number;
  /** Position along a segment from start (0) to end (1); 0 on arcs. */
  u: number;
}

// Hits closer than this are the surface the ray has just left.
const selfHitDistance = 1e-6;

export function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** A point given in an object's own frame (x along its angle), placed on the bench. */
export function toBench(object: SceneObject, localX: number, localY: number): Point {
  const cos = Math.cos(radians(object.angle));
  const sin = Math.sin(radians(object.angle));
  return { x: object.x + localX * cos - localY * sin, y: object.y + localX * sin + localY * cos };
}

/** The difference a - b of two angles in radians, wrapped into [-π, π]. */
export function angleDifference(a: number, b: number): number {
  let difference = (a - b) % (2 * Math.PI);
  if (difference > Math.PI) difference -= 2 * Math.PI;
  if (difference < -Math.PI) difference += 2 * Math.PI;
  return difference;
}

/** Sags, thickness, sphere centres and half angles of a biconvex lens. */
export function lensGeometry(lens: Extract<SceneObject, { kind: 'lens' }>) {
  const halfAperture = lens.diameter / 2;
  const sag1 = lens.radius1 - Math.sqrt(lens.radius1 ** 2 - halfAperture ** 2);
  const sag2 = lens.radius2 - Math.sqrt(lens.radius2 ** 2 - halfAperture ** 2);
  const thickness = lensThickness(lens);
  return {
    halfAperture,
    sag1,
    sag2,
    thickness,
    centre1: toBench(lens, -thickness / 2 + lens.radius1, 0),
    centre2: toBench(lens, thickness / 2 - lens.radius2, 0),
    halfAngle1: Math.asin(halfAperture / lens.radius1),
    halfAngle2: Math.asin(halfAperture / lens.radius2),
  };
}

/** The three corners of an equilateral prism, its apex along the object's local -y. */
export function prismCorners(prism: Extract<SceneObject, { kind: 'prism' }>): Point[] {
  const height = (prism.side * Math.sqrt(3)) / 2;
  return [
    toBench(prism, 0, (-2 * height) / 3),
    toBench(prism, prism.side / 2, height / 3),
    toBench(prism, -prism.side / 2, height / 3),
  ];
}

function flatSurface(object: SceneObject, length: number, role: SurfaceRole): Surface {
  return {
    shape: 'segment',
    start: toBench(object, -length / 2, 0),
    end: toBench(object, length / 2, 0),
    normal: null,
    role,
    object,
  };
}

/** The segments and arcs that make up an object's optical surfaces. */
export function surfacesOf(object: SceneObject): Surface[] {
  const angle = radians(object.angle);
  switch (object.kind) {
    case 'mirror':
    case 'detector':
    case 'blocker':
      return [flatSurface(object, object.length, object.kind)];
    case 'arcMirror': {
      const concave = object.form === 'concave';
      return [
        {
          shape: 'arc',
          centre: toBench(object, concave ? object.radius : -object.radius, 0),
          radius: object.radius,
          middleAngle: concave ? angle + Math.PI : angle,
          halfAngle: Math.asin(object.diameter / 2 / object.radius),
          role: 'mirror',
          object,
        },
      ];
    }
    case 'lens':
      return lensSurfaces(object);
    case 'prism':
      return prismSurfaces(object);
    case 'ball':
      return [
        {
          shape: 'arc',
          centre: { x: object.x, y: object.y },
          radius: object.diameter / 2,
          middleAngle: 0,
          halfAngle: Math.PI,
          role: 'glass',
          object,
        },
      ];
    case 'eye':
      return [
        {
          shape: 'segment',
          start: toBench(object, 0, -object.pupil / 2),
          end: toBench(object, 0, object.pupil / 2),
          normal: null,
          role: 'eye',
          object,
        },
      ];
    default:
      return [];
  }
}

function lensSurfaces(lens: Extract<SceneObject, { kind: 'lens' }>): Surface[] {
  const angle = radians(lens.angle);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const geometry = lensGeometry(lens);
  const edgeStart = -geometry.thickness / 2 + geometry.sag1;
  const edgeEnd = geometry.thickness / 2 - geometry.sag2;
  return [
    {
      shape: 'arc',
      centre: geometry.centre1,
      radius: lens.radius1,
      middleAngle: angle + Math.PI,
      halfAngle: geometry.halfAngle1,
      role: 'glass',
      object: lens,
    },
    {
      shape: 'arc',
      centre: geometry.centre2,
      radius: lens.radius2,
      middleAngle: angle,
      halfAngle: geometry.halfAngle2,
      role: 'glass',
      object: lens,
    },
    {
      shape: 'segment',
      start: toBench(lens, edgeStart, -geometry.halfAperture),
      end: toBench(lens, edgeEnd, -geometry.halfAperture),
      normal: { x: sin, y: -cos },
      role: 'glass',
      object: lens,
    },
    {
      shape: 'segment',
      start: toBench(lens, edgeStart, geometry.halfAperture),
      end: toBench(lens, edgeEnd, geometry.halfAperture),
      normal: { x: -sin, y: cos },
      role: 'glass',
      object: lens,
    },
  ];
}

function prismSurfaces(prism: Extract<SceneObject, { kind: 'prism' }>): Surface[] {
  const corners = prismCorners(prism);
  const surfaces: Surface[] = [];
  for (let i = 0; i < 3; i += 1) {
    const start = corners[i];
    const end = corners[(i + 1) % 3];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    let normal = { x: (end.y - start.y) / length, y: -(end.x - start.x) / length };
    const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const outward = normal.x * (middle.x - prism.x) + normal.y * (middle.y - prism.y) >= 0;
    if (!outward) normal = { x: -normal.x, y: -normal.y };
    surfaces.push({ shape: 'segment', start, end, normal, role: 'glass', object: prism });
  }
  return surfaces;
}

/** Where a ray first meets a surface, or null when it misses. */
export function hitSurface(surface: Surface, ray: Ray): SurfaceHit | null {
  if (surface.shape === 'segment') return hitSegment(surface, ray);
  return hitArc(surface, ray);
}

function hitSegment(segment: SegmentSurface, ray: Ray): SurfaceHit | null {
  const edgeX = segment.end.x - segment.start.x;
  const edgeY = segment.end.y - segment.start.y;
  const denominator = ray.dx * edgeY - ray.dy * edgeX;
  if (denominator > -1e-12 && denominator < 1e-12) return null;
  const toStartX = segment.start.x - ray.x;
  const toStartY = segment.start.y - ray.y;
  const t = (toStartX * edgeY - toStartY * edgeX) / denominator;
  const u = (toStartX * ray.dy - toStartY * ray.dx) / denominator;
  if (t <= selfHitDistance || u < 0 || u > 1) return null;
  return { t, u };
}

function hitArc(arc: ArcSurface, ray: Ray): SurfaceHit | null {
  const fromCentreX = ray.x - arc.centre.x;
  const fromCentreY = ray.y - arc.centre.y;
  const b = fromCentreX * ray.dx + fromCentreY * ray.dy;
  const c = fromCentreX ** 2 + fromCentreY ** 2 - arc.radius ** 2;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  for (const t of [-b - root, -b + root]) {
    if (t <= selfHitDistance) continue;
    if (arc.halfAngle >= Math.PI) return { t, u: 0 };
    const hitAngle = Math.atan2(fromCentreY + t * ray.dy, fromCentreX + t * ray.dx);
    if (Math.abs(angleDifference(hitAngle, arc.middleAngle)) <= arc.halfAngle) return { t, u: 0 };
  }
  return null;
}

/** The unit normal of a surface at a point on it: the stored one for faces, radial on arcs. */
export function normalAt(surface: Surface, x: number, y: number): Point {
  if (surface.shape === 'arc') {
    return {
      x: (x - surface.centre.x) / surface.radius,
      y: (y - surface.centre.y) / surface.radius,
    };
  }
  if (surface.normal) return surface.normal;
  const edgeX = surface.end.x - surface.start.x;
  const edgeY = surface.end.y - surface.start.y;
  const length = Math.hypot(edgeX, edgeY);
  return { x: -edgeY / length, y: edgeX / length };
}
