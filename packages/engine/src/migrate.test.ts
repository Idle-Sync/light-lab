import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { migrateScene } from './migrate';
import { parseScene, SceneError } from './scene';

describe('migrateScene', () => {
  it('passes a current version scene through parseScene', () => {
    expect(migrateScene(examples.bench)).toEqual(parseScene(examples.bench));
  });

  // Version 1 links and files predate the grid and sight-line settings; they open with defaults.
  it('upgrades a version 1 scene with its settings kept and the new ones defaulted', () => {
    const version1 = {
      v: 1,
      settings: { partialReflections: false, polarization: 's', brightness: '3d' },
      objects: [{ kind: 'ruler', id: 1, x: 0, y: 0, angle: 0, length: 50 }],
    };
    expect(migrateScene(version1)).toEqual({
      v: 2,
      settings: {
        partialReflections: false,
        polarization: 's',
        brightness: '3d',
        grid: { show: true, size: 10, snap: false },
        sightLines: true,
      },
      objects: version1.objects,
    });
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
