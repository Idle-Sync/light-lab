import { examples } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { physicalPatch } from './inspector-fields';

describe('physicalPatch', () => {
  const lens = examples.bench.objects[1];

  it('shrinks the lens diameter when a radius would make the surface impossible', () => {
    expect(physicalPatch(lens, { radius1: 10 })).toEqual({ radius1: 10, diameter: 19.6 });
  });

  it('leaves a possible lens alone', () => {
    expect(physicalPatch(lens, { radius1: 60 })).toEqual({ radius1: 60, diameter: 40 });
  });

  it('passes other kinds through', () => {
    const detector = examples.bench.objects[2];
    expect(physicalPatch(detector, { length: 10 })).toEqual({ length: 10 });
  });
});
