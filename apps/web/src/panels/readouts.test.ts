import { describe, expect, it } from 'vitest';
import { detectorReadout, lensLabel, overlapWarning, percent, readout } from './readouts';

describe('lensLabel', () => {
  it('names the sign in words and shows thick-lens beside traced', () => {
    const result = lensLabel(50.054, 49.8);
    expect(result.value).toBe('converging, f = +50.1 mm');
    expect(result.theory).toBe('thick-lens +50.1 mm, traced +49.8 mm');
    expect(result.assumes).not.toBe('');
    expect(result.explanation).not.toBe('');
  });

  it('says diverging for a negative focal length', () => {
    expect(lensLabel(-80, null).value).toBe('diverging, f = -80.0 mm');
  });

  it('says so when tracing found no focus', () => {
    expect(lensLabel(50, null).theory).toBe('thick-lens +50.0 mm, traced: no focus found');
  });
});

describe('detectorReadout', () => {
  it('reports no light for an empty or missing reading', () => {
    expect(detectorReadout(undefined, '2d').value).toBe('No light');
    expect(detectorReadout({ power: 0 }, '2d').value).toBe('No light');
  });

  it('states the 2D rule', () => {
    const result = detectorReadout({ power: 0.25 }, '2d');
    expect(result.value).toBe('25.0 %');
    expect(result.assumes).toContain('1/r');
  });

  it('names the 3D rule from the engine when brightness is 3d', () => {
    const result = detectorReadout({ power: 0.25 }, '3d');
    expect(result.assumes).toContain(
      'share a square sensor of that side catches in 3D over the share the line catches in 2D',
    );
    expect(result.assumes).not.toContain('length / (2');
    expect(result.assumes).toContain('exact for free-space spreading from a point source');
    expect(result.assumes).toContain('approximate after lenses or mirrors');
  });
});

describe('overlapWarning', () => {
  const kindOf = (id: number) => (id === 3 ? 'ball' : 'lens');

  it('names the other glass object', () => {
    expect(overlapWarning([[2, 3]], 2, kindOf)).toBe(
      'Overlaps ball: inside or outside is undefined',
    );
  });

  it('works from either side of the pair', () => {
    expect(overlapWarning([[2, 3]], 3, kindOf)).toBe(
      'Overlaps lens: inside or outside is undefined',
    );
  });

  it('is null for an object that overlaps nothing', () => {
    expect(overlapWarning([[2, 3]], 9, kindOf)).toBeNull();
  });
});

describe('percent and readout', () => {
  it('keeps three figures down to small shares', () => {
    expect(percent(0.917)).toBe('91.7 %');
    expect(percent(0.05)).toBe('5.00 %');
    expect(percent(0.0004)).toBe('0.0400 %');
    expect(percent(0.0000004)).toBe('4.0e-5 %');
  });

  it('refuses a readout without an assumes line', () => {
    expect(() => readout('Length', '5 mm', '', 'How long it is.')).toThrow();
  });

  it('refuses a readout without an explanation', () => {
    expect(() => readout('Length', '5 mm', 'Plain geometry.', '')).toThrow();
  });

  it('keeps the explanation and the theory text it is given', () => {
    const result = readout('Length', '5 mm', 'Plain geometry.', 'How long it is.', 'five');
    expect(result.explanation).toBe('How long it is.');
    expect(result.theory).toBe('five');
  });
});
