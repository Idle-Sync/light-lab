import { examples } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { createStore, type Store } from '../store';
import { physicalPatch, pickChip, sliderInput } from './inspector-fields';

function countUndoSteps(store: Store): number {
  let steps = 0;
  while (store.canUndo()) {
    store.undo();
    steps += 1;
  }
  return steps;
}

describe('physicalPatch', () => {
  const lens = examples.bench.objects[1];

  it('shrinks the lens diameter when a radius would make the surface impossible', () => {
    expect(physicalPatch(lens, { radius1: 10 })).toEqual({ radius1: 10, diameter: 19.6 });
  });

  it('leaves a possible lens alone', () => {
    expect(physicalPatch(lens, { radius1: 60 })).toEqual({ radius1: 60, diameter: 40 });
  });

  it('passes other kinds through', () => {
    const detector = examples.bench.objects[2];
    expect(physicalPatch(detector, { length: 10 })).toEqual({ length: 10 });
  });
});

describe('sliderInput', () => {
  it('makes one history entry for a thumb drag ended by pointerup', () => {
    const store = createStore(examples.bench);
    for (let step = 1; step <= 5; step += 1) {
      sliderInput(store, 2, 'diameter', 40 - step, { pointerHeld: true });
    }
    store.finishEdit();
    expect(store.getState().scene.objects[1]).toMatchObject({ diameter: 35 });
    expect(countUndoSteps(store)).toBe(1);
    expect(store.getState().scene).toEqual(examples.bench);
  });

  it('makes one history entry per keyboard step', () => {
    const store = createStore(examples.bench);
    for (let step = 1; step <= 3; step += 1) {
      sliderInput(store, 2, 'diameter', 40 - step, { pointerHeld: false });
    }
    expect(countUndoSteps(store)).toBe(3);
  });

  it('keeps the lens physical while sliding', () => {
    const store = createStore(examples.bench);
    sliderInput(store, 2, 'radius1', 10, { pointerHeld: false });
    expect(store.getState().scene.objects[1]).toMatchObject({ radius1: 10, diameter: 19.6 });
  });
});

describe('pickChip', () => {
  it('adds no history entry for the option already on', () => {
    const store = createStore(examples.bench);
    store.updateObject(2, { radius1: 80 });
    store.undo();
    pickChip(true, 'bk7', (value) => store.updateObject(2, { material: value as 'bk7' }));
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(true);
  });

  it('picks an option that is off', () => {
    const store = createStore(examples.bench);
    pickChip(false, 'sf11', (value) => store.updateObject(2, { material: value as 'sf11' }));
    expect(store.getState().scene.objects[1]).toMatchObject({ material: 'sf11' });
    expect(countUndoSteps(store)).toBe(1);
  });
});
