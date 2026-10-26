import { examples } from '@light-lab/engine';
import { describe, expect, it, vi } from 'vitest';
import { createStore, type Store } from '../store';
import { type CanvasBox, createGestures, type PointerInput } from './gestures';
import { benchToScreen, screenToBench } from './view';

// The canvas sits 50 px from the left and 60 px from the top of the window.
const box: CanvasBox = { left: 50, top: 60, width: 1000, height: 700 };
const size = { width: box.width, height: box.height };
// Client (60, 70) is bench (-245, -170) at the starting view: no object within 90 mm.
const emptySpot = { clientX: 60, clientY: 70 };

function pointer(pointerId: number, clientX: number, clientY: number): PointerInput {
  return { pointerId, clientX, clientY };
}

function clientPointOf(store: Store, benchX: number, benchY: number) {
  const screen = benchToScreen({ x: benchX, y: benchY }, store.getState().view, size);
  return { clientX: screen.x + box.left, clientY: screen.y + box.top };
}

function benchUnder(store: Store, clientX: number, clientY: number) {
  const local = { x: clientX - box.left, y: clientY - box.top };
  return screenToBench(local, store.getState().view, size);
}

function setup() {
  const store = createStore(examples.bench);
  const gestures = createGestures(store, () => box);
  return { store, gestures };
}

function emptyTraceResults() {
  return {
    trace: { buckets: {}, detectors: {}, segmentCount: 0 },
    eye: null,
    traceMs: 1,
    eyeMs: 0,
  };
}

describe('pan and zoom', () => {
  it('change only the view, so no retrace starts', () => {
    const { store, gestures } = setup();
    store.setResults(emptyTraceResults());
    const sceneBefore = store.getState().scene;
    const viewBefore = store.getState().view;

    gestures.pointerDown(pointer(1, emptySpot.clientX, emptySpot.clientY));
    gestures.pointerMove(pointer(1, 160, 120));
    gestures.pointerUp(pointer(1, 160, 120));
    gestures.wheel({ clientX: 400, clientY: 300, deltaY: -100 });

    const state = store.getState();
    expect(state.view).not.toEqual(viewBefore);
    expect(state.scene).toBe(sceneBefore);
    expect(state.traceCount).toBe(1);
    expect(store.canUndo()).toBe(false);
  });

  it('pans so the bench point under the pointer follows it', () => {
    const { store, gestures } = setup();
    const grabbed = benchUnder(store, emptySpot.clientX, emptySpot.clientY);
    gestures.pointerDown(pointer(1, emptySpot.clientX, emptySpot.clientY));
    gestures.pointerMove(pointer(1, 160, 120));
    const underPointer = benchUnder(store, 160, 120);
    expect(underPointer.x).toBeCloseTo(grabbed.x, 9);
    expect(underPointer.y).toBeCloseTo(grabbed.y, 9);
  });

  it('wheel zooms around the cursor', () => {
    const { store, gestures } = setup();
    const before = benchUnder(store, 400, 300);
    gestures.wheel({ clientX: 400, clientY: 300, deltaY: -100 });
    const after = benchUnder(store, 400, 300);
    expect(store.getState().view.scale).toBeGreaterThan(2);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it('zooms faster per unit for a trackpad pinch, which arrives as a wheel with ctrlKey', () => {
    const wheelStore = setup();
    wheelStore.gestures.wheel({ clientX: 400, clientY: 300, deltaY: -10 });
    const pinchStore = setup();
    pinchStore.gestures.wheel({ clientX: 400, clientY: 300, deltaY: -10, ctrlKey: true });
    expect(pinchStore.store.getState().view.scale).toBeGreaterThan(
      wheelStore.store.getState().view.scale,
    );
  });

  it('pinch zooms around the midpoint of two pointers', () => {
    const { store, gestures } = setup();
    const midpointBefore = benchUnder(store, 110, 70);
    gestures.pointerDown(pointer(1, 60, 70));
    gestures.pointerDown(pointer(2, 160, 70));
    gestures.pointerMove(pointer(1, 10, 70));
    gestures.pointerMove(pointer(2, 210, 70));
    expect(store.getState().view.scale).toBeCloseTo(4, 9);
    const midpointAfter = benchUnder(store, 110, 70);
    expect(midpointAfter.x).toBeCloseTo(midpointBefore.x, 9);
    expect(midpointAfter.y).toBeCloseTo(midpointBefore.y, 9);
  });

  it('pans with two pointers moving together', () => {
    const { store, gestures } = setup();
    const grabbed = benchUnder(store, 110, 70);
    gestures.pointerDown(pointer(1, 60, 70));
    gestures.pointerDown(pointer(2, 160, 70));
    gestures.pointerMove(pointer(1, 100, 90));
    gestures.pointerMove(pointer(2, 200, 90));
    expect(store.getState().view.scale).toBeCloseTo(2, 9);
    const underMidpoint = benchUnder(store, 150, 90);
    expect(underMidpoint.x).toBeCloseTo(grabbed.x, 9);
    expect(underMidpoint.y).toBeCloseTo(grabbed.y, 9);
  });

  it('ignores a pinch whose two pointers start on one point, keeping the view finite', () => {
    const { store, gestures } = setup();
    gestures.pointerDown(pointer(1, 300, 200));
    gestures.pointerDown(pointer(2, 300, 200));
    gestures.pointerMove(pointer(1, 300, 200));
    const { view } = store.getState();
    expect(Number.isFinite(view.scale)).toBe(true);
    expect(Number.isFinite(view.offsetX)).toBe(true);
    expect(Number.isFinite(view.offsetY)).toBe(true);
  });

  it('deselects when pressing empty space', () => {
    const { store, gestures } = setup();
    store.select(2);
    gestures.pointerDown(pointer(1, emptySpot.clientX, emptySpot.clientY));
    expect(store.getState().selectedId).toBeNull();
  });
});

describe('dragging an object', () => {
  it('selects it and keeps the grab offset while it moves', () => {
    const { store, gestures } = setup();
    const source = clientPointOf(store, -220, -70);
    gestures.pointerDown(pointer(1, source.clientX + 2, source.clientY));
    gestures.pointerMove(pointer(1, source.clientX + 22, source.clientY - 10));
    expect(store.getState().selectedId).toBe(1);
    expect(store.getState().scene.objects[0]).toMatchObject({ x: -210, y: -75 });
  });

  it('continues one edit on every move and finishes it on pointerup', () => {
    const { store, gestures } = setup();
    const updateObject = vi.spyOn(store, 'updateObject');
    const finishEdit = vi.spyOn(store, 'finishEdit');
    const source = clientPointOf(store, -220, -70);
    gestures.pointerDown(pointer(1, source.clientX, source.clientY));
    for (let step = 1; step <= 3; step += 1) {
      gestures.pointerMove(pointer(1, source.clientX + step * 4, source.clientY));
    }
    expect(updateObject).toHaveBeenCalledTimes(3);
    for (const call of updateObject.mock.calls) {
      expect(call[2]).toEqual({ continuesEdit: true });
    }
    expect(finishEdit).not.toHaveBeenCalled();
    gestures.pointerUp(pointer(1, source.clientX + 12, source.clientY));
    expect(finishEdit).toHaveBeenCalledTimes(1);
  });

  it('makes one history entry per drag', () => {
    const { store, gestures } = setup();
    for (let drag = 0; drag < 2; drag += 1) {
      const source = clientPointOf(store, store.getState().scene.objects[0].x, -70);
      gestures.pointerDown(pointer(1, source.clientX, source.clientY));
      gestures.pointerMove(pointer(1, source.clientX + 10, source.clientY));
      gestures.pointerMove(pointer(1, source.clientX + 20, source.clientY));
      gestures.pointerUp(pointer(1, source.clientX + 20, source.clientY));
    }
    expect(store.getState().scene.objects[0]).toMatchObject({ x: -200 });
    store.undo();
    expect(store.getState().scene.objects[0]).toMatchObject({ x: -210 });
    store.undo();
    expect(store.getState().scene).toEqual(examples.bench);
    expect(store.canUndo()).toBe(false);
  });

  it('adds no history entry when the dragged object is removed mid-drag', () => {
    const { store, gestures } = setup();
    const source = clientPointOf(store, -220, -70);
    gestures.pointerDown(pointer(1, source.clientX, source.clientY));
    store.removeObject(1);
    const sceneAfterRemoval = store.getState().scene;
    gestures.pointerMove(pointer(1, source.clientX + 10, source.clientY));
    expect(store.getState().scene).toBe(sceneAfterRemoval);
    store.undo();
    expect(store.getState().scene).toEqual(examples.bench);
  });

  it('finishes the drag when a second pointer starts a pinch', () => {
    const { store, gestures } = setup();
    const finishEdit = vi.spyOn(store, 'finishEdit');
    const source = clientPointOf(store, -220, -70);
    gestures.pointerDown(pointer(1, source.clientX, source.clientY));
    gestures.pointerMove(pointer(1, source.clientX + 10, source.clientY));
    gestures.pointerDown(pointer(2, source.clientX + 200, source.clientY));
    expect(finishEdit).toHaveBeenCalledTimes(1);
  });
});

describe('rotate handle', () => {
  // The lens (id 2) sits at (-120, -70) facing 0°; its handle is 20 mm + 28 px above it.
  function grabLensHandle() {
    const { store, gestures } = setup();
    store.select(2);
    const handle = clientPointOf(store, -120, -70 - 20 - 28 / 2);
    gestures.pointerDown(pointer(1, handle.clientX, handle.clientY));
    return { store, gestures };
  }

  function pointerAtAngle(store: Store, degrees: number): PointerInput {
    // The handle points along the object's -y axis, so the object angle is the pointer bearing + 90°.
    const bearing = ((degrees - 90) * Math.PI) / 180;
    const client = clientPointOf(
      store,
      -120 + 60 * Math.cos(bearing),
      -70 + 60 * Math.sin(bearing),
    );
    return pointer(1, client.clientX, client.clientY);
  }

  it('snaps to the nearest 15° within 2.5°', () => {
    const { store, gestures } = grabLensHandle();
    gestures.pointerMove(pointerAtAngle(store, 46));
    expect(store.getState().scene.objects[1]).toMatchObject({ angle: 45 });
    gestures.pointerMove(pointerAtAngle(store, 28));
    expect(store.getState().scene.objects[1]).toMatchObject({ angle: 30 });
  });

  it('follows the pointer freely outside the snap window', () => {
    const { store, gestures } = grabLensHandle();
    gestures.pointerMove(pointerAtAngle(store, 50));
    expect(store.getState().scene.objects[1]).toMatchObject({ angle: 50 });
  });

  it('rotates as one history entry', () => {
    const { store, gestures } = grabLensHandle();
    gestures.pointerMove(pointerAtAngle(store, 20));
    gestures.pointerMove(pointerAtAngle(store, 50));
    gestures.pointerUp(pointerAtAngle(store, 50));
    store.undo();
    expect(store.getState().scene).toEqual(examples.bench);
  });
});
