import { decodeSceneLink, type Scene, SceneError } from '@light-lab/engine';
import { loadLastScene, saveLastScene } from './storage';
import type { Store } from './store';

export function isSceneLink(hash: string): boolean {
  return hash.startsWith('#z.') || hash.startsWith('#j.');
}

/**
 * The page's storage, or null when the browser blocks site data: reading `localStorage` then
 * throws a SecurityError, and the app runs without restoring or saving scenes.
 */
export function storageOrNull(getStorage: () => Storage): Storage | null {
  try {
    return getStorage();
  } catch (error) {
    if (error instanceof DOMException) return null;
    throw error;
  }
}

/** The scene saved last, or null when there is none or the browser refuses to read storage. */
export function lastSavedScene(storage: Storage | null): Scene | null {
  if (!storage) return null;
  try {
    return loadLastScene(storage);
  } catch (error) {
    if (error instanceof DOMException) return null;
    throw error;
  }
}

/** Saves every new scene for the next visit and clears a link error once the scene changes. */
export function keepLastScene(store: Store, storage: Storage | null): void {
  let savedScene = store.getState().scene;
  store.subscribe(() => {
    const { scene, linkError } = store.getState();
    if (scene === savedScene) return;
    savedScene = scene;
    if (linkError !== null) store.setLinkError(null);
    if (!storage) return;
    try {
      saveLastScene(storage, scene);
    } catch (error) {
      // A full or blocked storage only loses the restore on the next visit; throwing here would
      // stop the store notifying the listeners after this one, so the edit would not show.
      if (!(error instanceof DOMException)) throw error;
    }
  });
}

/**
 * Returns a function that opens a scene link. Decoding is asynchronous, so when a newer link
 * starts before an older one finishes, the older result is dropped.
 */
export function createLinkOpener(
  store: Store,
  openScene: (scene: Scene) => void,
  decode: (hash: string) => Promise<Scene> = decodeSceneLink,
) {
  let newestLink = 0;
  return async function openLink(hash: string): Promise<void> {
    newestLink += 1;
    const thisLink = newestLink;
    let scene: Scene;
    try {
      scene = await decode(hash);
    } catch (error) {
      if (!(error instanceof SceneError)) throw error;
      if (thisLink === newestLink) {
        store.setLinkError(`This link is not a Light Lab scene: ${error.message}`);
      }
      return;
    }
    if (thisLink !== newestLink) return;
    openScene(scene);
    store.setLinkError(null);
  };
}
