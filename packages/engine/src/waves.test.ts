import { describe, expect, it } from 'vitest';
import { computeWaves, type WaveSetup } from './waves';

const prototypeDefaults: WaveSetup = {
  mode: 'double',
  nm: 532,
  slitWidth: 40,
  slitSeparation: 250,
  slitCount: 6,
  screenDistance: 1000,
  halfWidth: 20,
  screenPoints: 900,
};

function percentOffFraunhofer(mode: 'single' | 'double'): number {
  const { measured, fraunhofer } = computeWaves({ ...prototypeDefaults, mode }).measured;
  if (measured === null || fraunhofer === null) throw new Error(`${mode} fringe not found`);
  return ((measured - fraunhofer) / fraunhofer) * 100;
}

describe('computeWaves', () => {
  it('single slit: Huygens first minimum matches Fraunhofer within 0.01 %', () => {
    expect(Math.abs(percentOffFraunhofer('single'))).toBeLessThanOrEqual(0.01);
  });

  it('double slit: Huygens first order matches Fraunhofer within 0.01 %', () => {
    expect(Math.abs(percentOffFraunhofer('double'))).toBeLessThanOrEqual(0.01);
  });

  it('single slit first minimum equals L tan(asin(lambda / a)) within 1e-4 mm', () => {
    const { measured, theory } = computeWaves({ ...prototypeDefaults, mode: 'single' }).measured;
    if (measured === null || theory === null) throw new Error('first minimum not found');
    const expected = 1000 * Math.tan(Math.asin(532e-6 / 40e-3));
    expect(theory).toBeCloseTo(expected, 9);
    expect(Math.abs(measured - theory)).toBeLessThanOrEqual(1e-4);
  });

  it('returns one normalised sample per screen point', () => {
    const result = computeWaves({ ...prototypeDefaults, mode: 'single' });
    expect(result.intensity).toHaveLength(900);
    expect(Math.max(...result.intensity)).toBe(1);
  });
});
