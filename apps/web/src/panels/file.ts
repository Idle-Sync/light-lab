import { migrateScene, type Scene } from '@light-lab/engine';

export function sceneToFileText(scene: Scene): string {
  return JSON.stringify(scene, null, 2);
}

/** Parses a saved scene file; throws `SceneError` or `SyntaxError` with a readable message. */
export function sceneFromFileText(text: string): Scene {
  return migrateScene(JSON.parse(text));
}
