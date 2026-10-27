import { describe, expect, it } from 'vitest';
import { focalPoints } from './focal';
import {
  type ImageArrow,
  imageLabel,
  imagesOf,
  maxImageArrows,
  maxObjectOpticPairs,
} from './images';
import { refractiveIndex, thickLensFocalLength } from './materials';
import { defaultSettings, type Scene, type SceneObject, wrapAngle } from './scene';

// The same figure as `farthestImage` in images.ts: images past it are treated as at infinity.
const farthestImage = 20000;

type ExtendedObject = Extract<SceneObject, { kind: 'object' }>;
type Lens = Extract<SceneObject, { kind: 'lens' }>;

function extendedObject(overrides: Partial<ExtendedObject>): ExtendedObject {
  return {
    kind: 'object',
    id: 1,
    x: 0,
    y: 0,
    angle: 0,
    height: 20,
    cone: 20,
    rays: 5,
    spectrum: 587.6,
    ...overrides,
  };
}

function lens(overrides: Partial<Lens>): Lens {
  return {
    kind: 'lens',
    id: 2,
    x: 0,
    y: 0,
    angle: 0,
    radius1: 200,
    radius2: 200,
    diameter: 20,
    material: 'bk7',
    ...overrides,
  };
}

function sceneOf(objects: SceneObject[]): Scene {
  return { v: 3, settings: { ...defaultSettings }, objects };
}

function expectNear(point: { x: number; y: number }, x: number, y: number, tolerance: number) {
  expect(Math.abs(point.x - x)).toBeLessThan(tolerance);
  expect(Math.abs(point.y - y)).toBeLessThan(tolerance);
}

function arrow(overrides: Partial<ImageArrow>): ImageArrow {
  return {
    sourceId: 1,
    path: 't0t1',
    kind: 'real',
    base: { x: 0, y: 0 },
    tip: { x: 0, y: 10 },
    baseFrom: { x: -10, y: 0 },
    tipFrom: { x: -10, y: 0 },
    blur: 0,
    magnification: -1,
    ...overrides,
  };
}

const focalLength = thickLensFocalLength(lens({}), refractiveIndex('bk7', 587.6));

describe('imagesOf with a flat mirror', () => {
  it('puts a virtual, upright, same-size image behind a mirror facing the object', () => {
    const scene = sceneOf([
      extendedObject({}),
      { kind: 'mirror', id: 2, x: 100, y: 0, angle: 90, length: 60 },
    ]);
    const arrows = imagesOf(scene);
    expect(arrows).toHaveLength(1);
    const [image] = arrows;
    expect(image.kind).toBe('virtual');
    expectNear(image.base, 200, 0, 0.01);
    expectNear(image.tip, 200, -20, 0.01);
    expect(Math.abs(image.magnification - 1)).toBeLessThan(0.001);
    expect(imageLabel(image)).toBe('Virtual image, upright, same size');
  });

  it('keeps the image upright when a mirror at 45° folds the light', () => {
    const scene = sceneOf([
      extendedObject({}),
      { kind: 'mirror', id: 2, x: 100, y: 0, angle: 45, length: 60 },
    ]);
    const arrows = imagesOf(scene);
    expect(arrows).toHaveLength(1);
    expect(arrows[0].kind).toBe('virtual');
    expect(imageLabel(arrows[0])).toBe('Virtual image, upright, same size');
  });
});

describe('imagesOf with a converging lens', () => {
  it('forms a real, upside down, smaller image at the thin-lens distance', () => {
    const objectDistance = 500;
    const scene = sceneOf([extendedObject({ x: -objectDistance }), lens({})]);
    const arrows = imagesOf(scene);
    expect(arrows).toHaveLength(1);
    const [image] = arrows;
    const thinLensDistance = 1 / (1 / focalLength - 1 / objectDistance);
    expect(image.kind).toBe('real');
    expect(Math.abs(image.base.x - thinLensDistance) / thinLensDistance).toBeLessThan(0.02);
    expect(image.magnification).toBeLessThan(0);
    expect(Math.abs(image.magnification)).toBeLessThan(1);
    expect(imageLabel(image)).toMatch(/^Real image, upside down, .*smaller$/);
  });

  it('gives two lenses in line one image each, not a second copy from the second pair', () => {
    const scene = sceneOf([extendedObject({ x: -500 }), lens({}), lens({ id: 3, x: 100 })]);
    const arrows = imagesOf(scene);
    expect(arrows).toHaveLength(2);
    expect(arrows[0].path).not.toBe(arrows[1].path);
  });
});

describe('imagesOf leaves images out', () => {
  it('returns none when the scene hides images', () => {
    const scene = sceneOf([extendedObject({ x: -500 }), lens({})]);
    scene.settings = { ...scene.settings, showImages: false };
    expect(imagesOf(scene)).toEqual([]);
  });

  it('returns none without an extended object', () => {
    const scene = sceneOf([
      { kind: 'point', id: 1, x: -500, y: 0, angle: 0, cone: 10, rays: 9, spectrum: 587.6 },
      lens({}),
    ]);
    expect(imagesOf(scene)).toEqual([]);
  });

  it('returns none for an object at the focal point, whose light leaves parallel', () => {
    const focus = focalPoints(lens({}), 587.6)[0];
    const scene = sceneOf([extendedObject({ x: focus.x, y: focus.y, height: 2 }), lens({})]);
    expect(imagesOf(scene)).toEqual([]);
  });

  it('keeps no image farther than the farthest image distance from the lens', () => {
    const focus = focalPoints(lens({}), 587.6)[0];
    const scene = sceneOf([extendedObject({ x: focus.x + 1, y: focus.y, height: 2 }), lens({})]);
    for (const image of imagesOf(scene)) {
      expect(Math.hypot(image.base.x, image.base.y)).toBeLessThanOrEqual(farthestImage);
      expect(Math.hypot(image.tip.x, image.tip.y)).toBeLessThanOrEqual(farthestImage);
    }
  });
});

describe('imagesOf in a crowded scene', () => {
  const objectCount = 250;
  const mirrorCount = 250;

  /** Extended objects far to the left, the first one at the origin and only 2 mm tall. */
  function extendedObjects(): SceneObject[] {
    const objects: SceneObject[] = [extendedObject({ id: 0, height: 2 })];
    for (let index = 1; index < objectCount; index += 1) {
      objects.push(extendedObject({ id: index, x: -5000, y: index * 30, height: 2 }));
    }
    return objects;
  }

  /** A mirror 400 mm from the origin at `degrees`, facing the origin. */
  function facingMirror(id: number, degrees: number): SceneObject {
    const angle = (degrees * Math.PI) / 180;
    const x = 400 * Math.cos(angle);
    const y = 400 * Math.sin(angle);
    return { kind: 'mirror', id, x, y, angle: wrapAngle(degrees + 90), length: 5 };
  }

  /** A mirror 200 mm from the origin at `degrees`, lying along the line through the origin. */
  function edgeOnMirror(id: number, degrees: number): SceneObject {
    const angle = (degrees * Math.PI) / 180;
    const x = 200 * Math.cos(angle);
    const y = 200 * Math.sin(angle);
    return { kind: 'mirror', id, x, y, angle: wrapAngle(degrees), length: 20 };
  }

  /** `count` mirrors facing the origin, spread evenly over `span` degrees from `from`. */
  function facingMirrors(firstId: number, count: number, from: number, span: number) {
    const mirrors: SceneObject[] = [];
    for (let index = 0; index < count; index += 1) {
      mirrors.push(facingMirror(firstId + index, from + (span * index) / count));
    }
    return mirrors;
  }

  function expectUniqueAndNamed(arrows: ImageArrow[]): void {
    const keys = new Set<string>();
    for (const image of arrows) {
      expect(image.path).not.toBe('');
      keys.add(`${image.sourceId}|${image.path}`);
    }
    expect(keys.size).toBe(arrows.length);
  }

  it('stops at the arrow cap, imaging the first object before any other', () => {
    const scene = sceneOf([
      ...extendedObjects(),
      ...facingMirrors(objectCount, mirrorCount, -150, 300),
    ]);
    expect(scene.objects).toHaveLength(objectCount + mirrorCount);
    const arrows = imagesOf(scene);
    expect(arrows).toHaveLength(maxImageArrows);
    for (const image of arrows) expect(image.sourceId).toBe(0);
    expectUniqueAndNamed(arrows);
  });

  it('visits only the first pairs: mirrors past them are never imaged', () => {
    // Rays from the origin never meet a mirror that lies along a line through the origin.
    const hidden: SceneObject[] = [];
    for (let index = 0; index < maxObjectOpticPairs; index += 1) {
      hidden.push(edgeOnMirror(objectCount + index, 240 + (80 * index) / maxObjectOpticPairs));
    }
    // Light the facing mirrors send back crosses the origin towards 140° to 220°, clear of them.
    const facingCount = mirrorCount - maxObjectOpticPairs;
    const facing = facingMirrors(objectCount + maxObjectOpticPairs, facingCount, -40, 80);
    const scene = sceneOf([...extendedObjects(), ...hidden, ...facing]);
    expect(scene.objects).toHaveLength(objectCount + mirrorCount);
    expect(imagesOf(scene)).toEqual([]);

    const withoutHidden = sceneOf([...extendedObjects(), ...facing]);
    const arrows = imagesOf(withoutHidden);
    expect(arrows.length).toBeGreaterThan(0);
    expectUniqueAndNamed(arrows);
  });
});

describe('imageLabel', () => {
  it('names the ratio in whole and half steps, larger or smaller', () => {
    expect(imageLabel(arrow({ magnification: -2 }))).toBe('Real image, upside down, 2× larger');
    expect(imageLabel(arrow({ magnification: 2.5 }))).toBe('Real image, upright, 2.5× larger');
    expect(imageLabel(arrow({ kind: 'virtual', magnification: 1 / 3 }))).toBe(
      'Virtual image, upright, 3× smaller',
    );
  });

  it('calls a ratio within 5 % of one the same size', () => {
    expect(imageLabel(arrow({ magnification: -1.04 }))).toBe('Real image, upside down, same size');
    expect(imageLabel(arrow({ magnification: 0.96 }))).toBe('Real image, upright, same size');
  });
});
