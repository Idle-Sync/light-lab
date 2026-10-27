import type { DetectorReading } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { detectorVerdict } from './detector-verdict';

const binCount = 48;
const detectorLength = 48;

/** A reading whose bin i holds `bin(i)`: intensity plus red, green and blue shares. */
function reading(
  bin: (index: number) => { intensity: number; red?: number; green?: number; blue?: number },
): DetectorReading {
  const bins = {
    intensity: new Float64Array(binCount),
    red: new Float64Array(binCount),
    green: new Float64Array(binCount),
    blue: new Float64Array(binCount),
  };
  let power = 0;
  for (let index = 0; index < binCount; index += 1) {
    const { intensity, red = intensity, green = intensity, blue = intensity } = bin(index);
    bins.intensity[index] = intensity;
    bins.red[index] = red;
    bins.green[index] = green;
    bins.blue[index] = blue;
    power += intensity;
  }
  return { power, centroid: 0, rmsWidth: 1, hits: 100, bins };
}

describe('detectorVerdict', () => {
  it('says so when no light arrives, or there is no reading', () => {
    expect(detectorVerdict(undefined, detectorLength)).toBe('No light reaches the detector.');
    expect(
      detectorVerdict(
        reading(() => ({ intensity: 0 })),
        detectorLength,
      ),
    ).toBe('No light reaches the detector.');
  });

  it('calls light in one bin a sharp spot as wide as that bin', () => {
    const spot = reading((index) => ({ intensity: index === 20 ? 1 : 0 }));
    expect(detectorVerdict(spot, detectorLength)).toBe('Sharp spot, 1.00 mm wide.');
  });

  it('calls light in two adjacent bins a sharp spot as wide as both', () => {
    const spot = reading((index) => ({ intensity: index === 20 || index === 21 ? 1 : 0 }));
    expect(detectorVerdict(spot, detectorLength)).toBe('Sharp spot, 2.00 mm wide.');
  });

  it('calls a broad white hump light spread over its lit span', () => {
    const hump = reading((index) => ({
      intensity: index >= 8 && index < 40 ? 1 - Math.abs(index - 24) / 20 : 0,
    }));
    expect(detectorVerdict(hump, detectorLength)).toBe('Light spread over 32.00 mm.');
  });

  it('calls red on the left and blue on the right a spectrum', () => {
    const spectrum = reading((index) => {
      if (index < 12 || index >= 36) return { intensity: 0 };
      const share = (index - 12) / 23;
      return { intensity: 1, red: 1 - share, green: 0.5, blue: share };
    });
    expect(detectorVerdict(spectrum, detectorLength)).toBe(
      'Colours separated into a spectrum over 24.00 mm.',
    );
  });

  it('does not call a hump of the same colour everywhere a spectrum', () => {
    const hump = reading((index) => ({
      intensity: index >= 12 && index < 36 ? 1 : 0,
      red: 1,
      blue: 0.2,
    }));
    expect(detectorVerdict(hump, detectorLength)).toBe('Light spread over 24.00 mm.');
  });
});
