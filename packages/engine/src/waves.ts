export interface WaveSetup {
  mode: 'single' | 'double' | 'grating';
  nm: number;
  /** µm */
  slitWidth: number;
  /** µm */
  slitSeparation: number;
  slitCount: number;
  /** mm */
  screenDistance: number;
  /** mm */
  halfWidth: number;
  screenPoints: number;
}

export interface FringeMeasurement {
  measured: number | null;
  fraunhofer: number | null;
  theory: number | null;
  smallAngle: number;
}

export interface WaveResult {
  intensity: Float64Array;
  fraunhofer: Float64Array;
  measured: FringeMeasurement;
  fresnelNumber: number;
}

function slitsIn(setup: WaveSetup): number {
  if (setup.mode === 'single') return 1;
  if (setup.mode === 'double') return 2;
  return setup.slitCount;
}

/** Intensity of the Fraunhofer formula (single-slit envelope times grating factor) at screen height `y`. */
function fraunhoferAt(
  y: number,
  L: number,
  wavelength: number,
  a: number,
  d: number,
  slits: number,
): number {
  const sine = y / Math.hypot(y, L);
  const beta = (Math.PI * a * sine) / wavelength;
  const envelope = Math.abs(beta) < 1e-12 ? 1 : (Math.sin(beta) / beta) ** 2;
  if (slits === 1) return envelope;
  const alpha = (Math.PI * d * sine) / wavelength;
  const sineAlpha = Math.sin(alpha);
  const grating =
    Math.abs(sineAlpha) < 1e-12 ? 1 : (Math.sin(slits * alpha) / (slits * sineAlpha)) ** 2;
  return envelope * grating;
}

/**
 * Position of the extreme of `values` inside `centre ± halfWindow`, refined with a parabola.
 * Null when it sits on the window edge or off screen.
 */
function extremeNear(
  values: Float64Array,
  heights: Float64Array,
  centre: number,
  halfWindow: number,
  wantMaximum: boolean,
): number | null {
  const last = values.length - 1;
  const step = heights[1] - heights[0];
  const halfWidth = heights[last];
  const first = Math.max(1, Math.ceil((centre - halfWindow + halfWidth) / step));
  const end = Math.min(last - 1, Math.floor((centre + halfWindow + halfWidth) / step));
  let best = -1;
  for (let i = first; i <= end; i++) {
    const better = wantMaximum ? values[i] > values[best] : values[i] < values[best];
    if (best < 0 || better) best = i;
  }
  if (best < 0 || best === first || best === end) return null;
  const before = values[best - 1];
  const after = values[best + 1];
  const denominator = before - 2 * values[best] + after;
  const offset = denominator === 0 ? 0 : (0.5 * (before - after)) / denominator;
  return heights[best] + offset * step;
}

function measureFringe(
  intensity: Float64Array,
  fraunhofer: Float64Array,
  heights: Float64Array,
  setup: WaveSetup,
  slits: number,
): FringeMeasurement {
  const wavelength = setup.nm * 1e-6;
  const size = slits === 1 ? setup.slitWidth * 1e-3 : setup.slitSeparation * 1e-3;
  const smallAngle = (wavelength * setup.screenDistance) / size;
  const result: FringeMeasurement = { measured: null, fraunhofer: null, theory: null, smallAngle };
  if (wavelength / size >= 1) return result;

  const theory = setup.screenDistance * Math.tan(Math.asin(wavelength / size));
  result.theory = theory;
  const halfWindow = 0.3 * smallAngle;
  const wantMaximum = slits > 1;
  const right = extremeNear(intensity, heights, theory, halfWindow, wantMaximum);
  const left = extremeNear(intensity, heights, -theory, halfWindow, wantMaximum);
  if (right !== null && left !== null) result.measured = (right - left) / 2;
  const rightFormula = extremeNear(fraunhofer, heights, theory, halfWindow, wantMaximum);
  const leftFormula = extremeNear(fraunhofer, heights, -theory, halfWindow, wantMaximum);
  if (rightFormula !== null && leftFormula !== null) {
    result.fraunhofer = (rightFormula - leftFormula) / 2;
  }
  return result;
}

/** Screen intensity from a Huygens–Fresnel sum over the slits, beside the Fraunhofer formula. */
export function computeWaves(setup: WaveSetup): WaveResult {
  const wavelength = setup.nm * 1e-6;
  const waveNumber = (2 * Math.PI) / wavelength;
  const width = setup.slitWidth * 1e-3;
  const separation = setup.slitSeparation * 1e-3;
  const L = setup.screenDistance;
  const halfWidth = setup.halfWidth;
  const slits = slitsIn(setup);
  const pointCount = Math.max(300, Math.min(2000, Math.round(setup.screenPoints)));

  const slitCentres: number[] = [];
  for (let j = 0; j < slits; j++) slitCentres.push((j - (slits - 1) / 2) * separation);

  const totalWidth = (slits - 1) * separation + width;
  const edge = halfWidth + totalWidth / 2;
  const phaseSpan =
    (waveNumber * width * edge) / Math.hypot(edge, L) + (waveNumber * width * width) / (4 * L);
  const wavelets = Math.min(600, Math.max(24, Math.ceil(phaseSpan / 0.2) + 8));
  const offsets = new Float64Array(wavelets);
  for (let q = 0; q < wavelets; q++) offsets[q] = -width / 2 + ((q + 0.5) * width) / wavelets;

  const intensity = new Float64Array(pointCount);
  const fraunhofer = new Float64Array(pointCount);
  const heights = new Float64Array(pointCount);
  let brightest = 0;
  for (let i = 0; i < pointCount; i++) {
    const y = -halfWidth + (2 * halfWidth * i) / (pointCount - 1);
    let real = 0;
    let imaginary = 0;
    for (const centre of slitCentres) {
      for (const offset of offsets) {
        const dy = y - centre - offset;
        const distance = Math.sqrt(L * L + dy * dy);
        const phase = waveNumber * ((dy * dy) / (distance + L));
        // 2D cylindrical wavelet with obliquity factor
        const amplitude = (1 + L / distance) / (2 * Math.sqrt(distance));
        real += amplitude * Math.cos(phase);
        imaginary += amplitude * Math.sin(phase);
      }
    }
    heights[i] = y;
    intensity[i] = real * real + imaginary * imaginary;
    brightest = Math.max(brightest, intensity[i]);
    fraunhofer[i] = fraunhoferAt(y, L, wavelength, width, separation, slits);
  }
  for (let i = 0; i < pointCount; i++) intensity[i] /= brightest;

  return {
    intensity,
    fraunhofer,
    measured: measureFringe(intensity, fraunhofer, heights, setup, slits),
    fresnelNumber: (totalWidth / 2) ** 2 / (wavelength * L),
  };
}
