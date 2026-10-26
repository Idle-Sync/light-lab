import type { Scene } from '@light-lab/engine';
import { wrap } from 'comlink';
import type { EngineWorker, SceneResults } from './engine-worker';

type Compute = (scene: Scene, eyeId: number | null) => Promise<SceneResults>;
type ResultsListener = (results: SceneResults, scene: Scene) => void;

/**
 * Sends scenes to `compute` with at most one call in flight. A request made while one is
 * pending replaces the waiting scene, so a fast drag never builds a backlog of stale traces.
 */
export function createEngineClient(compute: Compute) {
  let inFlight = false;
  let waiting: { scene: Scene; eyeId: number | null } | null = null;
  const listeners = new Set<ResultsListener>();

  async function send(scene: Scene, eyeId: number | null): Promise<void> {
    inFlight = true;
    try {
      const results = await compute(scene, eyeId);
      for (const listener of listeners) listener(results, scene);
    } finally {
      inFlight = false;
      const next = waiting;
      waiting = null;
      if (next) void send(next.scene, next.eyeId);
    }
  }

  return {
    request(scene: Scene, eyeId: number | null): void {
      if (inFlight) {
        waiting = { scene, eyeId };
        return;
      }
      void send(scene, eyeId);
    },

    subscribe(listener: ResultsListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type EngineClient = ReturnType<typeof createEngineClient>;

/** Starts the engine in a Web Worker and returns its `computeScene` as a plain async function. */
export function startEngineWorker(): Compute {
  const worker = new Worker(new URL('./engine-worker.ts', import.meta.url), { type: 'module' });
  const engine = wrap<EngineWorker>(worker);
  return (scene, eyeId) => engine.computeScene(scene, eyeId);
}
