import {
  analyzeEye,
  type EyeAnalysis,
  type ImageArrow,
  imagesOf,
  type Scene,
  type TraceResult,
  trace,
} from '@light-lab/engine';
import { expose } from 'comlink';

export interface SceneResults {
  trace: TraceResult;
  eye: EyeAnalysis | null;
  images: ImageArrow[];
  traceMs: number;
  eyeMs: number;
  imagesMs: number;
}

function computeScene(scene: Scene, eyeId: number | null): SceneResults {
  const traceStart = performance.now();
  const traceResult = trace(scene);
  const traceMs = performance.now() - traceStart;

  const imagesStart = performance.now();
  const images = imagesOf(scene);
  const imagesMs = performance.now() - imagesStart;
  if (eyeId === null) return { trace: traceResult, eye: null, images, traceMs, eyeMs: 0, imagesMs };

  const eyeStart = performance.now();
  const eye = analyzeEye(scene, eyeId);
  const eyeMs = performance.now() - eyeStart;
  return { trace: traceResult, eye, images, traceMs, eyeMs, imagesMs };
}

const engineWorker = { computeScene };

export type EngineWorker = typeof engineWorker;

expose(engineWorker);
