import type { Scene } from './scene';

export interface EyeGroup {
  sourceId: number;
  pointIndex: number;
  nm: number;
  path: string;
  power: number;
  rayCount: number;
  transmission: number;
  kind: 'real' | 'virtual' | 'infinity' | 'behind';
  image: [number, number] | null;
  distance: number;
  angle: number;
  visible: boolean;
  low: number | null;
  high: number | null;
}

export interface EyeRow {
  path: string;
  power: number;
  transmission: number;
  rayCount: number;
  color: [number, number, number];
  top: EyeGroup;
}

export interface EyeAnalysis {
  eyeId: number;
  groups: EyeGroup[];
  rows: EyeRow[];
  totalIntoPupil: number;
}

/** Groups the rays entering an eye's pupil by path and finds where each group appears to come from. */
export function analyzeEye(_scene: Scene, eyeId: number): EyeAnalysis {
  return { eyeId, groups: [], rows: [], totalIntoPupil: 0 };
}

/** A sentence describing a ray path code such as "tt" or "tim". */
export function pathLabel(_path: string): string {
  return '';
}
