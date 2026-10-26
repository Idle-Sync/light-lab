import { lensThickness, type SceneObject } from '@light-lab/engine';
import type { Store, View } from '../store';
import { arcMirrorShapeOf, type Point, radians, rotateHandleOf } from './shapes';
import { benchToScreen, clampScale, screenToBench, viewPlacing, zoomAt } from './view';

export interface PointerInput {
  pointerId: number;
  clientX: number;
  clientY: number;
}

export interface WheelInput {
  clientX: number;
  clientY: number;
  deltaY: number;
  ctrlKey?: boolean;
}

/** Where the canvas sits in the window, as `getBoundingClientRect` reports it. */
export interface CanvasBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Gesture =
  | { mode: 'none' }
  | { mode: 'pan'; start: Point; startView: View }
  | { mode: 'move'; id: number; grabOffset: Point }
  | { mode: 'rotate'; id: number }
  | { mode: 'pinch'; startDistance: number; startMidpointOnBench: Point; startScale: number };

// Pixels from an object's outline that still count as a hit.
const pickTolerance = 9;
const handleRadius = 12;
const snapStep = 15;
const snapWindow = 2.5;
// A mouse wheel notch is about 100 units; a trackpad pinch sends a few units per event.
const zoomPerWheelUnit = 0.0015;
const zoomPerPinchUnit = 0.01;
// Two pointers closer than this at the start give no usable ratio for the zoom.
const shortestPinchStart = 1;

/** The shortest signed difference between two angles in radians, in (-π, π]. */
function angleDifference(a: number, b: number): number {
  let difference = (a - b) % (2 * Math.PI);
  if (difference > Math.PI) difference -= 2 * Math.PI;
  if (difference < -Math.PI) difference += 2 * Math.PI;
  return difference;
}

/** Whether a bench point lies on the object, `tolerance` mm counted as on it. */
export function objectContains(object: SceneObject, point: Point, tolerance: number): boolean {
  const cos = Math.cos(radians(object.angle));
  const sin = Math.sin(radians(object.angle));
  const dx = point.x - object.x;
  const dy = point.y - object.y;
  const along = dx * cos + dy * sin;
  const across = -dx * sin + dy * cos;
  switch (object.kind) {
    case 'point':
      return Math.hypot(dx, dy) < tolerance * 1.5;
    case 'eye':
      return Math.hypot(dx, dy) < object.pupil * 0.9 + tolerance;
    case 'object':
      return (
        Math.abs(along) < tolerance && across < tolerance && across > -object.height - tolerance
      );
    case 'beam':
      return Math.abs(along) < tolerance && Math.abs(across) < object.width / 2 + tolerance;
    case 'lens':
      return (
        Math.abs(along) < lensThickness(object) / 2 + tolerance &&
        Math.abs(across) < object.diameter / 2 + tolerance
      );
    case 'prism': {
      const height = (object.side * Math.sqrt(3)) / 2;
      if (across > height / 3 + tolerance || across < (-2 * height) / 3 - tolerance) return false;
      const halfWidthHere = (((across + (2 * height) / 3) / height) * object.side) / 2;
      return Math.abs(along) < halfWidthHere + tolerance;
    }
    case 'ball':
      return Math.hypot(dx, dy) < object.diameter / 2 + tolerance;
    case 'arcMirror': {
      const arc = arcMirrorShapeOf(object);
      const fromCentre = Math.hypot(point.x - arc.centre.x, point.y - arc.centre.y);
      const direction = Math.atan2(point.y - arc.centre.y, point.x - arc.centre.x);
      return (
        Math.abs(fromCentre - arc.radius) < tolerance &&
        Math.abs(angleDifference(direction, arc.middleAngle)) <
          arc.halfAngle + tolerance / arc.radius
      );
    }
    default:
      return Math.abs(across) < tolerance && Math.abs(along) < object.length / 2 + tolerance;
  }
}

/** The topmost object under a bench point, or null. */
function objectAt(objects: SceneObject[], point: Point, scale: number): SceneObject | null {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    if (objectContains(objects[index], point, pickTolerance / scale)) return objects[index];
  }
  return null;
}

/** Object angle, in degrees, that points the rotate handle at `point`; snaps near 15° steps. */
function handleAngle(object: SceneObject, point: Point): number {
  const degrees = (Math.atan2(point.y - object.y, point.x - object.x) * 180) / Math.PI + 90;
  const snapped = Math.round(degrees / snapStep) * snapStep;
  if (Math.abs(degrees - snapped) < snapWindow) return snapped;
  return degrees;
}

/**
 * Pointer and wheel handlers for the bench canvas. One pointer drags an object, turns the
 * rotate handle of the selected object, or pans on empty space; two pointers pinch-zoom and pan.
 */
export function createGestures(store: Store, getCanvasBox: () => CanvasBox) {
  const pointers = new Map<number, Point>();
  let gesture: Gesture = { mode: 'none' };

  function localPoint(input: { clientX: number; clientY: number }): Point {
    const box = getCanvasBox();
    return { x: input.clientX - box.left, y: input.clientY - box.top };
  }

  function canvasSize() {
    const box = getCanvasBox();
    return { width: box.width, height: box.height };
  }

  function twoPointers(): [Point, Point] | null {
    const points = [...pointers.values()];
    if (points.length !== 2) return null;
    return [points[0], points[1]];
  }

  function endObjectEdit(): void {
    if (gesture.mode === 'move' || gesture.mode === 'rotate') store.finishEdit();
  }

  function startPinch(first: Point, second: Point): void {
    const startDistance = Math.hypot(second.x - first.x, second.y - first.y);
    if (startDistance < shortestPinchStart) {
      gesture = { mode: 'none' };
      return;
    }
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const { view } = store.getState();
    gesture = {
      mode: 'pinch',
      startDistance,
      startMidpointOnBench: screenToBench(midpoint, view, canvasSize()),
      startScale: view.scale,
    };
  }

  function startOnePointer(screen: Point): void {
    const { scene, selectedId, view } = store.getState();
    const size = canvasSize();
    const bench = screenToBench(screen, view, size);

    const selected = scene.objects.find((object) => object.id === selectedId);
    if (selected) {
      const handle = benchToScreen(rotateHandleOf(selected, view.scale), view, size);
      if (Math.hypot(handle.x - screen.x, handle.y - screen.y) < handleRadius) {
        gesture = { mode: 'rotate', id: selected.id };
        return;
      }
    }

    const picked = objectAt(scene.objects, bench, view.scale);
    if (picked) {
      store.select(picked.id);
      gesture = {
        mode: 'move',
        id: picked.id,
        grabOffset: { x: picked.x - bench.x, y: picked.y - bench.y },
      };
      return;
    }

    store.select(null);
    gesture = { mode: 'pan', start: screen, startView: view };
  }

  function movePinch(
    pinch: Extract<Gesture, { mode: 'pinch' }>,
    first: Point,
    second: Point,
  ): void {
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    const scale = clampScale((pinch.startScale * distance) / pinch.startDistance);
    // The bench point that started under the midpoint stays under it, so the fingers pan too.
    store.setView(viewPlacing(pinch.startMidpointOnBench, midpoint, scale, canvasSize()));
  }

  return {
    pointerDown(input: PointerInput): void {
      const screen = localPoint(input);
      pointers.set(input.pointerId, screen);
      const pair = twoPointers();
      if (pair) {
        endObjectEdit();
        startPinch(pair[0], pair[1]);
        return;
      }
      if (pointers.size === 1) startOnePointer(screen);
    },

    pointerMove(input: PointerInput): void {
      if (!pointers.has(input.pointerId)) return;
      const screen = localPoint(input);
      pointers.set(input.pointerId, screen);
      const { view } = store.getState();
      const bench = screenToBench(screen, view, canvasSize());

      if (gesture.mode === 'pinch') {
        const pair = twoPointers();
        if (pair) movePinch(gesture, pair[0], pair[1]);
        return;
      }
      if (gesture.mode === 'pan') {
        const start = gesture.start;
        const startView = gesture.startView;
        store.setView({
          offsetX: startView.offsetX - (screen.x - start.x) / startView.scale,
          offsetY: startView.offsetY - (screen.y - start.y) / startView.scale,
        });
        return;
      }
      if (gesture.mode === 'move') {
        const id = gesture.id;
        // An undo or delete during the drag can remove the object; a patch would then still commit.
        if (!store.getState().scene.objects.some((object) => object.id === id)) return;
        const patch = { x: bench.x + gesture.grabOffset.x, y: bench.y + gesture.grabOffset.y };
        store.updateObject(id, patch, { continuesEdit: true });
        return;
      }
      if (gesture.mode === 'rotate') {
        const id = gesture.id;
        const object = store.getState().scene.objects.find((candidate) => candidate.id === id);
        if (!object) return;
        store.updateObject(id, { angle: handleAngle(object, bench) }, { continuesEdit: true });
      }
    },

    pointerUp(input: PointerInput): void {
      if (!pointers.delete(input.pointerId)) return;
      endObjectEdit();
      gesture = { mode: 'none' };
    },

    wheel(input: WheelInput): void {
      const rate = input.ctrlKey ? zoomPerPinchUnit : zoomPerWheelUnit;
      const factor = Math.exp(-input.deltaY * rate);
      const { view } = store.getState();
      store.setView(zoomAt(view, factor, localPoint(input), canvasSize()));
    },
  };
}
