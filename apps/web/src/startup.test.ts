import { encodeSceneLink, examples, type Scene, SceneError } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { createLinkOpener, keepLastScene, lastSavedScene, storageOrNull } from './startup';
import { saveLastScene } from './storage';
import { createStore } from './store';

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

function refusingStorage(): Storage {
  const refuse = () => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  };
  return { ...memoryStorage(), getItem: refuse, setItem: refuse };
}

describe('browser storage', () => {
  it('is null when the browser blocks site data, so the app still starts', () => {
    const storage = storageOrNull(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    });
    expect(storage).toBeNull();
    expect(lastSavedScene(storage)).toBeNull();
  });

  it('gives no saved scene when reading storage throws', () => {
    expect(lastSavedScene(refusingStorage())).toBeNull();
  });

  it('keeps editing and notifying when a save is refused', () => {
    const store = createStore(examples.bench);
    keepLastScene(store, refusingStorage());
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });
    store.updateObject(1, { x: 0 });
    expect(store.getState().scene.objects[0]).toMatchObject({ x: 0 });
    expect(notified).toBeGreaterThan(0);
  });

  it('saves every new scene', () => {
    const store = createStore(examples.bench);
    const storage = memoryStorage();
    keepLastScene(store, storage);
    store.replaceScene(examples.ball);
    expect(lastSavedScene(storage)).toEqual(examples.ball);
  });
});

describe('createLinkOpener', () => {
  it('keeps the newest link when an older one finishes decoding last', async () => {
    const store = createStore(examples.bench);
    const pending = new Map<string, (scene: Scene) => void>();
    const decode = (hash: string) =>
      new Promise<Scene>((resolve) => {
        pending.set(hash, resolve);
      });
    const openLink = createLinkOpener(store, (scene) => store.replaceScene(scene), decode);

    const older = openLink('#z.older');
    const newer = openLink('#z.newer');
    pending.get('#z.newer')?.(examples.magnifier);
    await newer;
    pending.get('#z.older')?.(examples.ball);
    await older;
    expect(store.getState().scene).toEqual(examples.magnifier);
  });

  it('shows no error from an older link that failed after a newer one started', async () => {
    const store = createStore(examples.bench);
    const decode = (hash: string) =>
      hash === '#z.older'
        ? new Promise<Scene>((_resolve, reject) =>
            setTimeout(() => reject(new SceneError('broken')), 0),
          )
        : Promise.resolve(examples.ball);
    const openLink = createLinkOpener(store, (scene) => store.replaceScene(scene), decode);
    const older = openLink('#z.older');
    await openLink('#z.newer');
    await older;
    expect(store.getState().linkError).toBeNull();
    expect(store.getState().scene).toEqual(examples.ball);
  });

  it('leaves the saved scene on screen and reports a bad link opened at start', async () => {
    const store = createStore(examples.bench);
    const storage = memoryStorage();
    saveLastScene(storage, examples.ball);
    keepLastScene(store, storage);
    const lastScene = lastSavedScene(storage);
    if (lastScene) store.replaceScene(lastScene);
    const openLink = createLinkOpener(store, (scene) => store.replaceScene(scene));

    await openLink('#z.garbage');
    expect(store.getState().scene).toEqual(examples.ball);
    expect(store.getState().linkError).toContain('This link is not a Light Lab scene');
    expect(lastSavedScene(storage)).toEqual(examples.ball);
  });

  it('opens a good link over the saved scene', async () => {
    const store = createStore(examples.bench);
    store.replaceScene(examples.ball);
    const openLink = createLinkOpener(store, (scene) => store.replaceScene(scene));
    await openLink(`#${await encodeSceneLink(examples.magnifier)}`);
    expect(store.getState().scene).toEqual(examples.magnifier);
  });
});
