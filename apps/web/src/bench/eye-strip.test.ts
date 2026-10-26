import { describe, expect, it } from 'vitest';
import { spotAlpha, stripX } from './eye-strip';

describe('spotAlpha', () => {
  it('rises monotonically with power across the whole range', () => {
    let previous = 0;
    for (let exponent = -8; exponent <= 1; exponent += 0.25) {
      const alpha = spotAlpha(10 ** exponent);
      expect(alpha).toBeGreaterThanOrEqual(previous);
      previous = alpha;
    }
  });

  it('is strictly brighter for more power inside the log scale', () => {
    expect(spotAlpha(1e-3)).toBeLessThan(spotAlpha(1e-2));
    expect(spotAlpha(1e-2)).toBeCloseTo(2 / 3, 9);
  });

  it('stays between 0.1 and 1', () => {
    expect(spotAlpha(1e-9)).toBe(0.1);
    expect(spotAlpha(1)).toBe(1);
  });
});

describe('stripX', () => {
  it('maps straight ahead to the middle and the field edges to the strip edges', () => {
    expect(stripX(0, 70, 400)).toBe(200);
    expect(stripX(-35, 70, 400)).toBe(0);
    expect(stripX(35, 70, 400)).toBe(400);
  });
});
