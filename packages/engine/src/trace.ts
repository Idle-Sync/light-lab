import type { Scene } from './scene';

export interface DetectorReading {
  power: number;
  centroid: number;
  rmsWidth: number;
  hits: number;
  bins: {
    intensity: Float64Array;
    red: Float64Array;
    green: Float64Array;
    blue: Float64Array;
  };
}

export interface RayBucket {
  nm: number;
  alpha: number;
  /** Segment end points, flat: [x0, y0, x1, y1, …]. */
  points: number[];
}

export interface TraceResult {
  buckets: Record<string, RayBucket>;
  detectors: Record<number, DetectorReading>;
  segmentCount: number;
}

/** Traces every source in the scene through its optics. */
export function trace(_scene: Scene): TraceResult {
  return { buckets: {}, detectors: {}, segmentCount: 0 };
}

/** Fresnel power reflectance for s and p polarization at an interface from n1 into n2. */
export function fresnelReflectance(
  _n1: number,
  _n2: number,
  _cosIncidence: number,
): { rs2: number; rp2: number } {
  return { rs2: 0, rp2: 0 };
}
