import { examples, SceneError } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { loadLastScene, saveLastScene, sceneFileText, sceneFromFileText } from './storage';

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

describe('scene file text', () => {
  it('round-trips every example', () => {
    for (const scene of Object.values(examples)) {
      expect(sceneFromFileText(sceneFileText(scene))).toEqual(scene);
    }
  });

  it('rejects text that is not JSON with a SceneError', () => {
    expect(() => sceneFromFileText('not json')).toThrowError(SceneError);
  });

  it('rejects JSON that is not a scene with a SceneError', () => {
    expect(() => sceneFromFileText('{"v":99}')).toThrowError(SceneError);
  });
});

describe('last scene', () => {
  it('loads the scene that was saved', () => {
    const storage = memoryStorage();
    saveLastScene(storage, examples.ball);
    expect(loadLastScene(storage)).toEqual(examples.ball);
  });

  it('returns null when nothing was saved', () => {
    expect(loadLastScene(memoryStorage())).toBeNull();
  });

  it('returns null when the saved text is corrupt', () => {
    const storage = memoryStorage();
    saveLastScene(storage, examples.ball);
    storage.setItem('light-lab:last-scene', '{"v":1,"objects":');
    expect(loadLastScene(storage)).toBeNull();
  });

  it('returns null when the saved JSON is not a scene', () => {
    const storage = memoryStorage();
    storage.setItem('light-lab:last-scene', '{"v":0}');
    expect(loadLastScene(storage)).toBeNull();
  });
});
