import { parseScene, type Scene, SceneError } from './scene';

const currentVersion = 1;

/** Upgrades scene JSON from version `n` to `n + 1`, keyed by `n`. Never delete an entry. */
export const migrations: Record<number, (json: unknown) => unknown> = {};

/** Brings scene JSON of any shipped version up to the current one, then validates it. */
export function migrateScene(json: unknown): Scene {
  if (typeof json !== 'object' || json === null || !('v' in json)) {
    throw new SceneError('Scene has no version "v"');
  }
  let upgraded: unknown = json;
  let version = json.v;
  while (version !== currentVersion) {
    const upgrade = typeof version === 'number' ? migrations[version] : undefined;
    if (upgrade === undefined)
      throw new SceneError(`Scene version ${String(version)} is not supported`);
    upgraded = upgrade(upgraded);
    version = (version as number) + 1;
  }
  return parseScene(upgraded);
}
