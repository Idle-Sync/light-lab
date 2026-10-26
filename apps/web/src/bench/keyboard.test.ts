import { examples, type SceneObject } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { createStore } from '../store';
import { keyToSceneEdit } from './keyboard';

const lens: SceneObject = {
  kind: 'lens',
  id: 2,
  x: -120,
  y: -70,
  angle: 10,
  radius1: 50,
  radius2: 50,
  diameter: 40,
  material: 'bk7',
};

describe('keyToSceneEdit', () => {
  it('nudges 1 mm with the arrows', () => {
    expect(keyToSceneEdit('ArrowLeft', false, lens)).toEqual({ x: -121 });
    expect(keyToSceneEdit('ArrowRight', false, lens)).toEqual({ x: -119 });
    expect(keyToSceneEdit('ArrowUp', false, lens)).toEqual({ y: -71 });
    expect(keyToSceneEdit('ArrowDown', false, lens)).toEqual({ y: -69 });
  });

  it('nudges 10 mm with Shift and the arrows', () => {
    expect(keyToSceneEdit('ArrowLeft', true, lens)).toEqual({ x: -130 });
    expect(keyToSceneEdit('ArrowRight', true, lens)).toEqual({ x: -110 });
    expect(keyToSceneEdit('ArrowUp', true, lens)).toEqual({ y: -80 });
    expect(keyToSceneEdit('ArrowDown', true, lens)).toEqual({ y: -60 });
  });

  it('rotates 5 degrees with the brackets', () => {
    expect(keyToSceneEdit('[', false, lens)).toEqual({ angle: 5 });
    expect(keyToSceneEdit(']', false, lens)).toEqual({ angle: 15 });
  });

  it('ignores every other key', () => {
    for (const key of ['a', 'Enter', ' ', 'Tab', 'Escape', 'Shift']) {
      expect(keyToSceneEdit(key, false, lens)).toBeNull();
    }
  });

  it('makes one history entry per key press', () => {
    const store = createStore(examples.bench);
    for (let press = 0; press < 10; press += 1) {
      const object = store.getState().scene.objects[1];
      const patch = keyToSceneEdit('ArrowRight', false, object);
      if (!patch) throw new Error('ArrowRight should nudge');
      store.updateObject(object.id, patch);
    }
    expect(store.getState().scene.objects[1]).toMatchObject({ x: -110 });
    let undoSteps = 0;
    while (store.canUndo()) {
      store.undo();
      undoSteps += 1;
    }
    expect(undoSteps).toBe(10);
  });
});
