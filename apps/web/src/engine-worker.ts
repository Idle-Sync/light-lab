import {
  analyzeEye,
  type EyeAnalysis,
  type Scene,
  type TraceResult,
  trace,
} from '@light-lab/engine';
import { expose } from 'comlink';

export interface SceneResults {
  trace: TraceResult;
  eye: EyeAnalysis | null;
  traceMs: number;
  eyeMs: number;
}

function computeScene(scene: Scene, eyeId: number | null): SceneResults {
  const traceStart = performance.now();
  const traceResult = trace(scene);
  const traceMs = performance.now() - traceStart;
  if (eyeId === null) return { trace: traceResult, eye: null, traceMs, eyeMs: 0 };

  const eyeStart = performance.now();
  const eye = analyzeEye(scene, eyeId);
  return { trace: traceResult, eye, traceMs, eyeMs: performance.now() - eyeStart };
}

const engineWorker = { computeScene };

export type EngineWorker = typeof engineWorker;

expose(engineWorker);
