import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import {
  refractiveIndex,
  spectrumOf,
  symmetricLensRadius,
  thickLensFocalLength,
} from './materials';
import type { SceneObject } from './scene';

describe('refractiveIndex', () => {
  it('gives the catalogue nd of N-BK7 at the helium d-line', () => {
    expect(refractiveIndex('bk7', 587.56)).toBeCloseTo(1.5168, 5);
  });

  it('is higher for blue light than for red light (normal dispersion)', () => {
    expect(refractiveIndex('sf11', 450)).toBeGreaterThan(refractiveIndex('sf11', 650));
  });
});

describe('spectrumOf', () => {
  it('splits white light into seven wavelengths from 400 to 670 nm', () => {
    expect(spectrumOf('white')).toEqual([400, 445, 490, 535, 580, 625, 670]);
  });

  it('keeps a single wavelength as it is', () => {
    expect(spectrumOf(632.8)).toEqual([632.8]);
  });
});

describe('thickLensFocalLength', () => {
  it('gives f = 50.054 mm for the bench lens at 587.56 nm', () => {
    const lens = examples.bench.objects.find((object: SceneObject) => object.kind === 'lens');
    if (lens?.kind !== 'lens') throw new Error('the bench example has no lens');
    const focalLength = thickLensFocalLength(lens, refractiveIndex('bk7', 587.56));
    expect(focalLength).toBeCloseTo(50.054, 2);
  });
});

describe('symmetricLensRadius', () => {
  const n = refractiveIndex('bk7', 587.56);

  // The focal length slider sets this radius; the lens label must then read the same number.
  it.each([15, 50, 100, 250])('gives a lens whose focal length is %s mm', (focal) => {
    const radius = symmetricLensRadius(focal, n, 30);
    const diameter = Math.min(30, 1.96 * radius);
    const lens = { radius1: radius, radius2: radius, diameter };
    expect(thickLensFocalLength(lens, n)).toBeCloseTo(focal, 2);
  });

  it('stops at the radius limits of the inspector', () => {
    expect(symmetricLensRadius(1, n, 30)).toBe(10);
    expect(symmetricLensRadius(10_000, n, 30)).toBe(400);
  });
});
