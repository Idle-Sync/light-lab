import type { SceneObject, Settings } from '@light-lab/engine';

/** One number or fact shown in the inspector, with the modelling assumption behind it. */
export interface Readout {
  label: string;
  value: string;
  theory?: string;
  assumes: string;
}

export function readout(label: string, value: string, assumes: string, theory?: string): Readout {
  if (assumes === '') throw new Error(`Readout "${label}" needs an assumes line`);
  return { label, value, theory, assumes };
}

/** A share of one source's power, with more digits as the share gets small. */
export function percent(share: number): string {
  const x = share * 100;
  if (x >= 10) return `${x.toFixed(1)} %`;
  if (x >= 0.1) return `${x.toFixed(2)} %`;
  if (x >= 0.001) return `${x.toFixed(4)} %`;
  return `${x.toExponential(1)} %`;
}

export function lengthText(mm: number): string {
  if (Math.abs(mm) < 1) return `${(mm * 1000).toFixed(0)} µm`;
  return `${mm.toFixed(2)} mm`;
}

function signedMillimetres(value: number): string {
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(1)} mm`;
}

/** The lens focal length with its sign in words; `theory` sets the thick-lens figure beside the traced one. */
export function lensLabel(theory: number, measured: number | null): Readout {
  const kind = theory >= 0 ? 'converging' : 'diverging';
  const traced = measured === null ? 'no focus found' : signedMillimetres(measured);
  return readout(
    'Focal length at 587.6 nm',
    `${kind}, f = ${signedMillimetres(theory)}`,
    'Thick-lens formula for a biconvex lens in air; the traced value follows a ray near the axis, so it includes spherical aberration.',
    `thick-lens ${signedMillimetres(theory)}, traced${measured === null ? ': ' : ' '}${traced}`,
  );
}

const rule2d = 'Brightness in 2D: light spreads as 1/r, not 1/r² as in a 3D world.';
const rule3d =
  'Brightness in 3D equivalent: each hit is weighted by sensor length / (2 · path length travelled), as for a square sensor of that side. The rule is exact for free-space spreading from a point source and approximate after lenses or mirrors, because a 2D scene does not know the 3D focusing.';

export function detectorReadout(
  reading: { power: number } | undefined,
  brightness: Settings['brightness'],
): Readout {
  const assumes = brightness === '3d' ? rule3d : rule2d;
  if (!reading || reading.power <= 0) return readout('Power', 'No light', assumes);
  return readout('Power, share of one source', percent(reading.power), assumes);
}

/** The warning for a glass object that overlaps another, or null when it overlaps nothing. */
export function overlapWarning(
  pairs: Array<[number, number]>,
  id: number,
  kindOf: (id: number) => SceneObject['kind'],
): string | null {
  const others: string[] = [];
  for (const [first, second] of pairs) {
    if (first === id) others.push(kindOf(second));
    if (second === id) others.push(kindOf(first));
  }
  if (others.length === 0) return null;
  return `Overlaps ${others.join(' and ')}: inside or outside is undefined`;
}
