import { migrateScene, type Scene, SceneError } from '@light-lab/engine';

const lastSceneKey = 'light-lab:last-scene';

/** The text of a scene file the user saves to disk. */
export function sceneFileText(scene: Scene): string {
  return JSON.stringify(scene, null, 2);
}

/** Reads a scene file's text; throws `SceneError` when it is not a valid scene of any shipped version. */
export function sceneFromFileText(text: string): Scene {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new SceneError('Scene file does not hold JSON', { cause: error });
  }
  return migrateScene(json);
}

export function saveLastScene(storage: Storage, scene: Scene): void {
  storage.setItem(lastSceneKey, JSON.stringify(scene));
}

/** The scene saved last, or null when none was saved or the saved text is no longer a valid scene. */
export function loadLastScene(storage: Storage): Scene | null {
  const text = storage.getItem(lastSceneKey);
  if (text === null) return null;
  try {
    return sceneFromFileText(text);
  } catch (error) {
    if (error instanceof SceneError) return null;
    throw error;
  }
}
