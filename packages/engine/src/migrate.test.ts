import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { migrateScene } from './migrate';
import { parseScene, SceneError } from './scene';

describe('migrateScene', () => {
  it('passes a version 1 scene through parseScene', () => {
    expect(migrateScene(examples.bench)).toEqual(parseScene(examples.bench));
  });

  it.each([0, 99])('names version %i when it is not a shipped version', (version) => {
    expect(() => migrateScene({ v: version, objects: [] })).toThrowError(SceneError);
    expect(() => migrateScene({ v: version, objects: [] })).toThrowError(
      new RegExp(`version ${version}\\b`),
    );
  });

  it('rejects JSON without a version', () => {
    expect(() => migrateScene({ objects: [] })).toThrowError(SceneError);
  });

  it('rejects JSON that is not an object', () => {
    expect(() => migrateScene(null)).toThrowError(SceneError);
  });
});
