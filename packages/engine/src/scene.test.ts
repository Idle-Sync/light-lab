import { examples, parseScene, parseSceneObject, SceneError } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';

describe('parseScene', () => {
  it('accepts every example scene unchanged', () => {
    for (const scene of Object.values(examples)) {
      expect(parseScene(scene)).toEqual(scene);
    }
  });

  it('fills missing settings with their defaults', () => {
    const scene = parseScene({ v: 1, objects: [] });
    expect(scene.settings).toEqual({
      partialReflections: true,
      polarization: 'unpolarized',
      brightness: '2d',
    });
  });

  it('rejects a scene without a version', () => {
    const parse = () => parseScene({ objects: [] });
    expect(parse).toThrowError(SceneError);
    expect(parse).toThrowError(/^v: [^\n]+$/);
  });

  it('rejects an unknown kind', () => {
    const scene = { v: 1, objects: [{ kind: 'laser', id: 1, x: 0, y: 0, angle: 0 }] };
    const parse = () => parseScene(scene);
    expect(parse).toThrowError(SceneError);
    expect(parse).toThrowError(/^objects\.0\.kind: [^\n]+$/);
  });

  // A mirror carrying a lens's radius would otherwise load and silently lose the field.
  it("rejects an object carrying another kind's fields", () => {
    const mirror = { kind: 'mirror', id: 1, x: 0, y: 0, angle: 0, length: 60, radius1: 50 };
    const parse = () => parseScene({ v: 1, objects: [mirror] });
    expect(parse).toThrowError(SceneError);
    expect(parse).toThrowError(/^objects\.0\.radius1: [^\n]+$/);
  });
});

describe('parseSceneObject', () => {
  it('rejects a field from another kind', () => {
    const lensWithLength = { ...examples.bench.objects[1], length: 40 };
    expect(() => parseSceneObject(lensWithLength)).toThrowError(/^length: [^\n]+$/);
  });
});
