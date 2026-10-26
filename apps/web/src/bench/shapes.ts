import { lensThickness, type SceneObject } from '@light-lab/engine';

export interface Point {
  x: number;
  y: number;
}

export function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** The bench point at `along`, `across` mm in the object's own axes (along = its angle). */
export function toBench(object: SceneObject, along: number, across: number): Point {
  const cos = Math.cos(radians(object.angle));
  const sin = Math.sin(radians(object.angle));
  return {
    x: object.x + along * cos - across * sin,
    y: object.y + along * sin + across * cos,
  };
}

/** Half the size of the object's bounding square, in mm; used to fit the view and place labels. */
export function extentOf(object: SceneObject): number {
  switch (object.kind) {
    case 'lens':
    case 'ball':
    case 'arcMirror':
      return object.diameter / 2;
    case 'prism':
      return object.side * 0.6;
    case 'beam':
      return object.width / 2;
    case 'point':
    case 'object':
      return 4;
    case 'eye':
      return object.pupil * 0.75 + 4;
    default:
      return object.length / 2;
  }
}

/** How far the object reaches across its own axis, in mm; the rotate handle sits beyond it. */
export function perpendicularExtentOf(object: SceneObject): number {
  switch (object.kind) {
    case 'lens':
    case 'ball':
    case 'arcMirror':
      return object.diameter / 2;
    case 'prism':
      return (object.side * Math.sqrt(3)) / 3;
    case 'beam':
      return object.width / 2;
    case 'object':
      return object.height;
    case 'eye':
      return object.pupil * 0.75;
    default:
      return 0;
  }
}

/** The rotate handle of an object, 28 screen pixels beyond its perpendicular extent. */
export function rotateHandleOf(object: SceneObject, scale: number): Point {
  return toBench(object, 0, -(perpendicularExtentOf(object) + 28 / scale));
}

export interface LensShape {
  thickness: number;
  frontCentre: Point;
  backCentre: Point;
  /** Half the angle each surface spans, in radians. */
  frontHalfAngle: number;
  backHalfAngle: number;
}

export function lensShapeOf(lens: Extract<SceneObject, { kind: 'lens' }>): LensShape {
  const thickness = lensThickness(lens);
  const halfAperture = lens.diameter / 2;
  return {
    thickness,
    frontCentre: toBench(lens, -thickness / 2 + lens.radius1, 0),
    backCentre: toBench(lens, thickness / 2 - lens.radius2, 0),
    frontHalfAngle: Math.asin(halfAperture / lens.radius1),
    backHalfAngle: Math.asin(halfAperture / lens.radius2),
  };
}

export interface ArcShape {
  centre: Point;
  radius: number;
  /** Direction from the centre to the middle of the arc, in radians. */
  middleAngle: number;
  halfAngle: number;
}

export function arcMirrorShapeOf(mirror: Extract<SceneObject, { kind: 'arcMirror' }>): ArcShape {
  const concave = mirror.form === 'concave';
  return {
    centre: toBench(mirror, concave ? mirror.radius : -mirror.radius, 0),
    radius: mirror.radius,
    middleAngle: concave ? radians(mirror.angle) + Math.PI : radians(mirror.angle),
    halfAngle: Math.asin(mirror.diameter / 2 / mirror.radius),
  };
}

/** Corners of an equilateral prism, apex first. */
export function prismCornersOf(prism: Extract<SceneObject, { kind: 'prism' }>): Point[] {
  const height = (prism.side * Math.sqrt(3)) / 2;
  return [
    toBench(prism, 0, (-2 * height) / 3),
    toBench(prism, prism.side / 2, height / 3),
    toBench(prism, -prism.side / 2, height / 3),
  ];
}
