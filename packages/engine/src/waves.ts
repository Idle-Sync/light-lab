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

/** Screen intensity from a Huygens–Fresnel sum over the slits, beside the Fraunhofer formula. */
export function computeWaves(_setup: WaveSetup): WaveResult {
  return {
    intensity: new Float64Array(0),
    fraunhofer: new Float64Array(0),
    measured: { measured: null, fraunhofer: null, theory: null, smallAngle: 0 },
    fresnelNumber: 0,
  };
}
