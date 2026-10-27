import type { SceneObject } from '@light-lab/engine';
import type { View } from '../store';
import { extentOf, type Point } from './shapes';

export interface CanvasSize {
  width: number;
  height: number;
}

export const minScale = 0.3;
export const maxScale = 40;
// Below this width the toolbar and inspector stack instead of floating at the sides.
const narrowWidth = 760;

/** The round length (1, 2 or 5 times a power of ten) at or above `length`. */
export function niceLength(length: number): number {
  const power = 10 ** Math.floor(Math.log10(length));
  const mantissa = length / power;
  if (mantissa <= 1) return power;
  if (mantissa <= 2) return 2 * power;
  if (mantissa <= 5) return 5 * power;
  return 10 * power;
}

// Closer grid lines turn into a grey wash over the rays.
const closestGridLinePixels = 8;

/** The spacing, in mm, of the grid lines drawn: the grid size times a power of 5, at least 8 px apart. */
export function gridStepOnScreen(size: number, scale: number): number {
  let step = size;
  while (step * scale < closestGridLinePixels) step *= 5;
  return step;
}

export function clampScale(scale: number): number {
  return Math.min(maxScale, Math.max(minScale, scale));
}

export function screenToBench(point: Point, view: View, size: CanvasSize): Point {
  return {
    x: view.offsetX + (point.x - size.width / 2) / view.scale,
    y: view.offsetY + (point.y - size.height / 2) / view.scale,
  };
}

export function benchToScreen(point: Point, view: View, size: CanvasSize): Point {
  return {
    x: (point.x - view.offsetX) * view.scale + size.width / 2,
    y: (point.y - view.offsetY) * view.scale + size.height / 2,
  };
}

/** The view that shows `benchPoint` at `screenPoint` at the given scale. */
export function viewPlacing(
  benchPoint: Point,
  screenPoint: Point,
  scale: number,
  size: CanvasSize,
): View {
  return {
    scale,
    offsetX: benchPoint.x - (screenPoint.x - size.width / 2) / scale,
    offsetY: benchPoint.y - (screenPoint.y - size.height / 2) / scale,
  };
}

/** Scales the view by `factor`, keeping the bench point under `screenPoint` in place. */
export function zoomAt(view: View, factor: number, screenPoint: Point, size: CanvasSize): View {
  const benchPoint = screenToBench(screenPoint, view, size);
  return viewPlacing(benchPoint, screenPoint, clampScale(view.scale * factor), size);
}

/** The part of the canvas not covered by the floating toolbar, inspector and bottom controls. */
export function freeArea(size: CanvasSize) {
  if (size.width < narrowWidth) {
    return { left: 16, right: size.width - 16, top: 28, bottom: size.height * 0.45 };
  }
  return { left: 92, right: size.width - 332, top: 28, bottom: size.height - 80 };
}

/** The view that shows every object, with a 12 mm margin, inside the free area. */
export function fitView(objects: SceneObject[], size: CanvasSize): View {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const object of objects) {
    const reach = extentOf(object) + 12;
    left = Math.min(left, object.x - reach);
    right = Math.max(right, object.x + reach);
    top = Math.min(top, object.y - reach);
    bottom = Math.max(bottom, object.y + reach);
  }
  if (objects.length === 0) {
    left = -100;
    right = 100;
    top = -100;
    bottom = 100;
  }

  const area = freeArea(size);
  const scale = clampScale(
    Math.min((area.right - area.left) / (right - left), (area.bottom - area.top) / (bottom - top)),
  );
  const benchCentre = { x: (left + right) / 2, y: (top + bottom) / 2 };
  const areaCentre = { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 };
  return viewPlacing(benchCentre, areaCentre, scale, size);
}
