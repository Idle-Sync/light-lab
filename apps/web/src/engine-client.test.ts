import { examples, type Scene } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { createEngineClient } from './engine-client';
import type { SceneResults } from './engine-worker';

function resultsFor(scene: Scene): SceneResults {
  return {
    trace: { buckets: {}, detectors: {}, segmentCount: scene.objects.length },
    eye: null,
    traceMs: 0,
    eyeMs: 0,
  };
}

function sceneWithObjects(count: number): Scene {
  return { ...examples.bench, objects: examples.bench.objects.slice(0, count) };
}

function createFakeEngine() {
  const pending: Array<{ scene: Scene; finish: () => void }> = [];
  const calls: Scene[] = [];
  async function compute(scene: Scene): Promise<SceneResults> {
    calls.push(scene);
    const { promise, resolve } = Promise.withResolvers<void>();
    pending.push({ scene, finish: resolve });
    await promise;
    return resultsFor(scene);
  }
  async function finishNext(): Promise<void> {
    const next = pending.shift();
    if (!next) throw new Error('no computation is pending');
    next.finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { compute, calls, finishNext };
}

describe('createEngineClient', () => {
  it('keeps one computation in flight and sends only the newest waiting scene', async () => {
    const engine = createFakeEngine();
    const client = createEngineClient(engine.compute);
    const delivered: Array<{ results: SceneResults; scene: Scene }> = [];
    client.subscribe((results, scene) => delivered.push({ results, scene }));

    const scenes = [1, 2, 3, 4, 5].map(sceneWithObjects);
    for (const scene of scenes) {
      client.request(scene, null);
    }
    expect(engine.calls).toEqual([scenes[0]]);

    await engine.finishNext();
    expect(engine.calls).toEqual([scenes[0], scenes[4]]);

    await engine.finishNext();
    expect(engine.calls).toHaveLength(2);
    expect(delivered.map((delivery) => delivery.scene)).toEqual([scenes[0], scenes[4]]);
    expect(delivered.map((delivery) => delivery.results.trace.segmentCount)).toEqual([1, 5]);
  });

  it('sends a request at once when nothing is in flight', async () => {
    const engine = createFakeEngine();
    const client = createEngineClient(engine.compute);
    client.request(sceneWithObjects(1), null);
    await engine.finishNext();
    client.request(sceneWithObjects(2), 3);
    expect(engine.calls).toHaveLength(2);
  });
});
