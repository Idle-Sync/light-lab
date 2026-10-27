import { parseScene, type Scene, SceneError, wrapAngle } from './scene';

const currentVersion = 2;

/** Upgrades scene JSON from version `n` to `n + 1`, keyed by `n`. Never delete an entry. */
export const migrations: Record<number, (json: object) => object> = {
  // Version 2 adds the optional `grid` and `sightLines` settings; their defaults fill them in.
  1: (json) => ({ ...json, v: 2 }),
};

/** Brings scene JSON of any shipped version up to the current one, then validates it. */
export function migrateScene(json: unknown): Scene {
  if (typeof json !== 'object' || json === null || !('v' in json)) {
    throw new SceneError('Scene has no version "v"');
  }
  let upgraded: object = json;
  let version = json.v;
  while (version !== currentVersion) {
    const upgrade = typeof version === 'number' ? migrations[version] : undefined;
    if (upgrade === undefined)
      throw new SceneError(`Scene version ${String(version)} is not supported`);
    upgraded = upgrade(upgraded);
    version = (version as number) + 1;
  }
  return parseScene(withWrappedAngles(upgraded));
}

/** Older links and files may hold angles such as 250; the schema wants the same turn inside -180..180. */
function withWrappedAngles(json: object): object {
  if (!('objects' in json) || !Array.isArray(json.objects)) return json;
  const objects = json.objects.map((object: unknown) => {
    if (typeof object !== 'object' || object === null) return object;
    if (!('angle' in object) || typeof object.angle !== 'number') return object;
    if (!Number.isFinite(object.angle)) return object;
    return { ...object, angle: wrapAngle(object.angle) };
  });
  return { ...json, objects };
}
