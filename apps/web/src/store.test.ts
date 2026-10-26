import { examples } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { analyzedEyeId, createStore } from './store';

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
