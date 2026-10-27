import { describe, expect, it } from 'vitest';
import { brightnessGraphPoints, millimetreTicks, whiteCardColors } from './detector-graph';

describe('whiteCardColors', () => {
  const bins = {
    intensity: Float64Array.of(0, 0.5, 1),
    red: Float64Array.of(0, 0.5, 1),
    green: Float64Array.of(0, 0, 0),
    blue: Float64Array.of(0, 0, 0),
  };

  it('gives one colour per bin', () => {
    expect(whiteCardColors(bins)).toHaveLength(3);
  });

  it('leaves an unlit bin black and scales the others by the peak', () => {
    expect(whiteCardColors(bins)).toEqual(['rgb(0, 0, 0)', 'rgb(128, 0, 0)', 'rgb(255, 0, 0)']);
  });

  it('shows a lit bin with no colour data as grey', () => {
    const grey = { ...bins, red: new Float64Array(3) };
    expect(whiteCardColors(grey)[2]).toBe('rgb(255, 255, 255)');
  });

  it('is all black when nothing is lit', () => {
    const dark = {
      intensity: new Float64Array(2),
      red: new Float64Array(2),
      green: new Float64Array(2),
      blue: new Float64Array(2),
    };
    expect(whiteCardColors(dark)).toEqual(['rgb(0, 0, 0)', 'rgb(0, 0, 0)']);
  });
});

describe('brightnessGraphPoints', () => {
  it('puts the peak at the top and an unlit bin at the bottom, in bin centres', () => {
    expect(brightnessGraphPoints(Float64Array.of(0, 2), 100, 40)).toBe('25,40 75,0');
  });

  it('stays at the bottom when nothing is lit', () => {
    expect(brightnessGraphPoints(new Float64Array(2), 100, 40)).toBe('25,40 75,40');
  });
});

describe('millimetreTicks', () => {
  const allowedSteps = [1, 2, 5, 10, 20, 50, 100];

  it('gives 4 to 10 marks at an allowed step for every detector length from 3 to 300 mm', () => {
    for (let length = 3; length <= 300; length += 1) {
      const ticks = millimetreTicks(length);
      expect(ticks.length).toBeGreaterThanOrEqual(4);
      expect(ticks.length).toBeLessThanOrEqual(10);
      const step = ticks[1].mm - ticks[0].mm;
      expect(allowedSteps).toContain(step);
    }
  });

  it('labels marks in mm and places them as a share of the length from the left end', () => {
    expect(millimetreTicks(40)[1]).toEqual({ mm: 5, label: '5 mm', share: 0.125 });
  });
});
