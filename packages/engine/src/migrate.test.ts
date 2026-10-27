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
      v: 3,
      settings: {
        partialReflections: false,
        polarization: 's',
        brightness: '3d',
        grid: { show: true, size: 10, snap: false },
        sightLines: true,
        showImages: true,
      },
      objects: version1.objects,
    });
  });

  it('upgrades a version 2 scene with showImages on and its other settings kept', () => {
    const version2 = {
      v: 2,
      settings: { partialReflections: false, brightness: '3d', sightLines: false },
      objects: [{ kind: 'ruler', id: 1, x: 0, y: 0, angle: 0, length: 50 }],
    };
    expect(migrateScene(version2)).toEqual({
      v: 3,
      settings: {
        partialReflections: false,
        polarization: 'unpolarized',
        brightness: '3d',
        grid: { show: true, size: 10, snap: false },
        sightLines: false,
        showImages: true,
      },
      objects: version2.objects,
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

  // Links, files and storage all return migrateScene(...), so one test covers the three.
  describe('angles outside -180..180', () => {
    const ruler = { kind: 'ruler', id: 1, x: 0, y: 0, length: 50 };

    it('wraps a version 2 angle of 250 to -110', () => {
      const scene = migrateScene({ v: 2, objects: [{ ...ruler, angle: 250 }] });
      expect(scene.objects[0].angle).toBe(-110);
    });

    it('keeps an angle of 180', () => {
      const scene = migrateScene({ v: 2, objects: [{ ...ruler, angle: 180 }] });
      expect(scene.objects[0].angle).toBe(180);
    });

    it('still rejects an infinite angle, naming the field', () => {
      const load = () =>
        migrateScene({ v: 2, objects: [{ ...ruler, angle: Number.POSITIVE_INFINITY }] });
      expect(load).toThrowError(SceneError);
      expect(load).toThrowError(/^objects\.0\.angle: /);
    });
  });
});
