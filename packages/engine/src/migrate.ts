import { parseScene, type Scene } from './scene';

/** Upgrades scene JSON from version `n` to `n + 1`, keyed by `n`. Never delete an entry. */
export const migrations: Record<number, (json: unknown) => unknown> = {};

/** Brings scene JSON of any shipped version up to the current one, then validates it. */
export function migrateScene(json: unknown): Scene {
  return parseScene(json);
}
