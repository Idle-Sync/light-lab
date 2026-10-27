import {
  defaultSettings,
  examples,
  maxObjects,
  parseScene,
  type Scene,
  type SceneObject,
} from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { extentOf } from './bench/shapes';
import { analyzedEyeId, store as appStore, createStore, snapToGrid } from './store';

function emptyScene(): Scene {
  return { v: 2, settings: defaultSettings, objects: [] };
}

function distance(first: SceneObject, second: SceneObject): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function countUndoSteps(store: ReturnType<typeof createStore>): number {
  let steps = 0;
  while (store.canUndo()) {
    store.undo();
    steps += 1;
  }
  return steps;
}

function dragSourceFiveTimes(store: ReturnType<typeof createStore>, startX: number): void {
  for (let step = 1; step <= 5; step += 1) {
    store.updateObject(1, { x: startX + step }, { continuesEdit: true });
  }
}

describe('store history', () => {
  it('merges five continuing edits into one entry', () => {
    const store = createStore(examples.bench);
    dragSourceFiveTimes(store, -220);
    expect(store.getState().scene.objects[0]).toMatchObject({ x: -215 });
    expect(countUndoSteps(store)).toBe(1);
    expect(store.getState().scene).toEqual(examples.bench);
  });

  it('makes two entries from two drags separated by finishEdit', () => {
    const store = createStore(examples.bench);
    dragSourceFiveTimes(store, -220);
    store.finishEdit();
    dragSourceFiveTimes(store, -215);
    store.undo();
    expect(store.getState().scene.objects[0]).toMatchObject({ x: -215 });
    store.undo();
    expect(store.getState().scene).toEqual(examples.bench);
    expect(store.canUndo()).toBe(false);
  });

  it('makes a plain update after finishEdit its own entry', () => {
    const store = createStore(examples.bench);
    dragSourceFiveTimes(store, -220);
    store.finishEdit();
    store.updateObject(1, { y: 0 });
    expect(countUndoSteps(store)).toBe(2);
  });

  it('makes every plain update its own entry', () => {
    const store = createStore(examples.bench);
    store.updateObject(1, { x: 0 });
    store.updateObject(1, { x: 10 });
    expect(countUndoSteps(store)).toBe(2);
  });

  it('restores the edited scene with undo then redo', () => {
    const store = createStore(examples.bench);
    store.updateObject(2, { radius1: 80 });
    const edited = store.getState().scene;
    store.undo();
    expect(store.getState().scene).toEqual(examples.bench);
    expect(store.canRedo()).toBe(true);
    store.redo();
    expect(store.getState().scene).toEqual(edited);
    expect(store.canRedo()).toBe(false);
  });

  it('drops redo steps once a new edit is made', () => {
    const store = createStore(examples.bench);
    store.updateObject(1, { x: 0 });
    store.undo();
    store.updateObject(1, { x: 5 });
    expect(store.canRedo()).toBe(false);
  });

  it('keeps at most 100 undo steps', () => {
    const store = createStore(examples.bench);
    for (let step = 1; step <= 150; step += 1) {
      store.updateObject(1, { x: step });
    }
    expect(countUndoSteps(store)).toBe(100);
    expect(store.getState().scene.objects[0]).toMatchObject({ x: 50 });
  });
});

describe('store edits', () => {
  it('rounds position and angle to 0.01 so links stay short', () => {
    const store = createStore(examples.bench);
    store.updateObject(1, { x: 1.23456, y: -7.891, angle: 12.3449 });
    expect(store.getState().scene.objects[0]).toMatchObject({ x: 1.23, y: -7.89, angle: 12.34 });
  });

  it('adds an object with the next id, selects it, and undoes the addition', () => {
    const store = createStore(examples.bench);
    store.addObject('lens');
    const added = store.getState().scene.objects.at(-1);
    expect(added).toMatchObject({ kind: 'lens', id: 10 });
    expect(store.getState().selectedId).toBe(10);
    store.undo();
    expect(store.getState().scene).toEqual(examples.bench);
  });

  // Objects stacked on one spot hide each other and cannot be picked apart by a beginner.
  it('places each new object clear of the objects already on the bench', () => {
    const store = createStore(emptyScene());
    for (let added = 0; added < 4; added += 1) store.addObject('lens');
    store.addObject('mirror');
    store.addObject('eye');
    const objects = store.getState().scene.objects;
    for (const first of objects) {
      for (const second of objects) {
        if (first === second) continue;
        expect(distance(first, second)).toBeGreaterThanOrEqual(extentOf(first) + extentOf(second));
      }
    }
  });

  it('places the first object at the centre of the view', () => {
    const store = createStore(emptyScene());
    store.setView({ offsetX: 40, offsetY: -20 });
    store.addObject('point');
    expect(store.getState().scene.objects[0]).toMatchObject({ x: 40, y: -20 });
  });

  it('places a new object on the grid when snapping is on', () => {
    const store = createStore(emptyScene());
    store.setSettings({ grid: { show: true, size: 25, snap: true } });
    store.setView({ offsetX: 37.3, offsetY: -11.2 });
    store.addObject('lens');
    store.addObject('lens');
    for (const object of store.getState().scene.objects) {
      expect(Math.abs(object.x % 25)).toBe(0);
      expect(Math.abs(object.y % 25)).toBe(0);
    }
  });

  it('clears the bench in one step that undo brings back, keeping the settings', () => {
    const store = createStore(examples.bench);
    store.setSettings({ sightLines: false });
    store.select(2);
    store.clearScene();
    expect(store.getState().scene.objects).toEqual([]);
    expect(store.getState().scene.settings.sightLines).toBe(false);
    expect(store.getState().selectedId).toBeNull();
    store.undo();
    expect(store.getState().scene.objects).toEqual(examples.bench.objects);
  });

  it('duplicates an object beside the original under a new id', () => {
    const store = createStore(examples.bench);
    store.duplicateObject(2);
    expect(store.getState().scene.objects.at(-1)).toMatchObject({
      kind: 'lens',
      id: 10,
      x: -108,
      y: -58,
    });
    expect(store.getState().selectedId).toBe(10);
  });

  it('duplicates onto the grid while snapping is on', () => {
    const store = createStore(examples.bench);
    store.setSettings({ grid: { show: true, size: 25, snap: true } });
    store.duplicateObject(2);
    expect(store.getState().scene.objects.at(-1)).toMatchObject({ x: -100, y: -50 });
  });

  it('removes an object and clears the selection', () => {
    const store = createStore(examples.bench);
    store.select(2);
    store.removeObject(2);
    expect(store.getState().scene.objects.some((object) => object.id === 2)).toBe(false);
    expect(store.getState().selectedId).toBeNull();
  });

  // The app sends the scene to the worker whenever the scene reference changes.
  it('changes the view without touching the scene', () => {
    const store = createStore(examples.bench);
    const scene = store.getState().scene;
    store.setView({ scale: 3 });
    expect(store.getState().scene).toBe(scene);
    expect(store.getState().view.scale).toBe(3);
    expect(store.canUndo()).toBe(false);
  });

  it('sizes the eye view without touching the scene or its history', () => {
    const store = createStore(examples.bench);
    const scene = store.getState().scene;
    store.setEyeView('large');
    expect(store.getState().eyeView).toBe('large');
    expect(store.getState().scene).toBe(scene);
    expect(store.canUndo()).toBe(false);
  });

  it('counts every delivered result', () => {
    const store = createStore(examples.bench);
    const results = {
      trace: { buckets: {}, detectors: {}, segmentCount: 0 },
      eye: null,
      traceMs: 1,
      eyeMs: 0,
    };
    store.setResults(results);
    store.setResults(results);
    expect(store.getState().traceCount).toBe(2);
    expect(store.getState().results).toBe(results);
  });

  it('notifies subscribers until they unsubscribe', () => {
    const store = createStore(examples.bench);
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.select(1);
    unsubscribe();
    store.select(2);
    expect(calls).toBe(1);
  });
});

describe('first visit', () => {
  // A newcomer starts on an empty bench; the examples stay one click away in the header.
  it('opens an empty bench', () => {
    expect(appStore.getState().scene.objects).toEqual([]);
  });
});

describe('snapToGrid', () => {
  it('rounds to the nearest grid line', () => {
    expect(snapToGrid(12.4, 5)).toBe(10);
    expect(snapToGrid(-12.6, 5)).toBe(-15);
    expect(snapToGrid(0.26, 0.5)).toBe(0.5);
  });

  // 0.1 steps in binary leave 0.30000000000000004, which would lengthen every link.
  it('returns values rounded to 0.01', () => {
    expect(snapToGrid(0.29, 0.1)).toBe(0.3);
  });
});

describe('analyzedEyeId', () => {
  it('prefers the selected eye, then the first eye, then none', () => {
    const twoEyes = {
      ...examples.ball,
      objects: [...examples.ball.objects, { ...examples.ball.objects[2], id: 4 }],
    };
    expect(analyzedEyeId(twoEyes, 4)).toBe(4);
    expect(analyzedEyeId(twoEyes, 1)).toBe(3);
    expect(analyzedEyeId(examples.bench, null)).toBeNull();
  });
});

describe('store writes stay inside the scene bounds', () => {
  function storeWithRuler(angle: number) {
    const ruler: SceneObject = { kind: 'ruler', id: 1, x: 0, y: 0, angle, length: 50 };
    return createStore({ v: 2, settings: defaultSettings, objects: [ruler] });
  }

  it('stops a drag past x = 10000 at 10000', () => {
    const store = storeWithRuler(0);
    store.updateObject(1, { x: 12000 });
    expect(store.getState().scene.objects[0].x).toBe(10000);
  });

  it('wraps a handle rotation of 250 degrees to -110', () => {
    const store = storeWithRuler(0);
    store.updateObject(1, { angle: 250 });
    expect(store.getState().scene.objects[0].angle).toBe(-110);
  });

  it('wraps a keyboard step from 180 to -175', () => {
    const store = storeWithRuler(180);
    store.updateObject(1, { angle: 185 });
    expect(store.getState().scene.objects[0].angle).toBe(-175);
  });

  it('keeps an angle of 180 when another field is edited', () => {
    const store = storeWithRuler(180);
    store.updateObject(1, { x: 5 });
    expect(store.getState().scene.objects[0].angle).toBe(180);
  });
});

describe('store object limit', () => {
  it('ignores add and duplicate once the scene holds maxObjects objects', () => {
    const ruler = { kind: 'ruler', x: 0, y: 0, angle: 0, length: 50 } as const;
    const objects = Array.from({ length: maxObjects }, (_, index) => ({ ...ruler, id: index + 1 }));
    const store = createStore({ v: 2, settings: defaultSettings, objects });
    store.addObject('ruler');
    store.duplicateObject(1);
    expect(store.getState().scene.objects).toHaveLength(maxObjects);
    expect(store.canUndo()).toBe(false);
    parseScene(store.getState().scene);
  });
});
