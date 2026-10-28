import { examples, type Scene, type SceneObject, wrapAngle } from '@light-lab/engine';
import type { CDPSession, Page } from '@playwright/test';
import { benchArea, expectSceneShown, sceneUrl, selectObject } from './bench';
import { expect, recordConsoleProblems, test } from './test';

const throttleRate = 4;
const warmUpTraces = 3;
const measuredTraces = 5;

type Timing = 'data-trace-ms' | 'data-eye-ms' | 'data-images-ms';

function statusPill(page: Page) {
  return page.locator('[data-trace-count]');
}

async function traceCount(page: Page): Promise<number> {
  return Number(await statusPill(page).getAttribute('data-trace-count'));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function percentile95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

/** Opens `scene`, selects object `id` and gives the bench keyboard focus for nudges. */
async function openForNudging(page: Page, scene: Scene, id: number): Promise<void> {
  await page.goto(await sceneUrl(scene));
  await expectSceneShown(page, scene);
  await selectObject(page, scene, id);
  await benchArea(page).focus();
}

/**
 * Nudges the selected object right and left to retrace, and returns the median of `timing`
 * over the traces after the warm-up.
 */
async function medianTiming(page: Page, timing: Timing): Promise<number> {
  const readings: number[] = [];
  for (let trace = 0; trace < warmUpTraces + measuredTraces; trace += 1) {
    const before = await traceCount(page);
    await page.keyboard.press(trace % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
    await expect.poll(() => traceCount(page)).toBeGreaterThan(before);
    if (trace >= warmUpTraces) readings.push(Number(await statusPill(page).getAttribute(timing)));
  }
  return median(readings);
}

/** Prints a reading to stdout: the `list` reporter shows it under the test on a pass as well. */
function printReading(name: string, ms: number, budgetMs: number): void {
  console.log(`${name} ${ms.toFixed(1)} ms, budget ${budgetMs} ms`);
}

async function throttle(session: CDPSession, rate: number): Promise<void> {
  await session.send('Emulation.setCPUThrottlingRate', { rate });
}

const benchWithDenseSource: Scene = {
  ...examples.bench,
  objects: examples.bench.objects.map((object) =>
    object.kind === 'point' ? { ...object, rays: 76 } : object,
  ),
};

/**
 * 250 extended objects and 250 mirrors, enough to reach the cap on object and optic pairs. The
 * first object sits inside a ring of mirrors facing it; the others point away from the ring with
 * one ray each, so the untimed main trace stays light.
 */
function imageCapObjects(): SceneObject[] {
  const objects: SceneObject[] = [
    { kind: 'object', id: 0, x: 0, y: 0, angle: 0, height: 20, cone: 20, rays: 1, spectrum: 589 },
  ];
  for (let id = 1; id < 250; id += 1) {
    const x = -700 - 30 * (id % 25);
    const y = -150 + 30 * Math.floor(id / 25);
    objects.push({
      kind: 'object',
      id,
      x,
      y,
      angle: 180,
      height: 20,
      cone: 1,
      rays: 1,
      spectrum: 589,
    });
  }
  for (let index = 0; index < 250; index += 1) {
    const degrees = -150 + (300 * index) / 250;
    const x = 400 * Math.cos((degrees * Math.PI) / 180);
    const y = 400 * Math.sin((degrees * Math.PI) / 180);
    objects.push({
      kind: 'mirror',
      id: 250 + index,
      x,
      y,
      angle: wrapAngle(degrees + 90),
      length: 5,
    });
  }
  return objects;
}

const imageCapScene: Scene = { ...examples.bench, objects: imageCapObjects() };

/**
 * The factor that turns the engine worker's timings into timings on a CPU `throttleRate` times
 * slower, after checking whether page throttling reaches the worker, and the bench trace
 * readings it was checked with. Chromium throttles only a page's main thread and refuses the
 * command on worker targets ("Operation is only supported for pages, not workers"); when the
 * worker does not slow down, its readings are scaled.
 */
async function workerSlowdown(
  page: Page,
  session: CDPSession,
): Promise<{ slowdown: number; fullSpeed: number; throttled: number }> {
  // The ruler (id 9) changes no ray, so nudging it retraces the same bench.
  await openForNudging(page, examples.bench, 9);
  const fullSpeed = await medianTiming(page, 'data-trace-ms');
  await throttle(session, throttleRate);
  const throttled = await medianTiming(page, 'data-trace-ms');
  const slowdown = throttled >= 2 * fullSpeed ? 1 : throttleRate;
  return { slowdown, fullSpeed, throttled };
}

/** Set by the worker throttling check in `beforeAll`, which every test below waits for. */
let workerCheck: { slowdown: number; benchTraceMs: number };

test.beforeAll(async ({ browser }) => {
  const start = Date.now();
  const page = await browser.newPage();
  const problems = recordConsoleProblems(page.context());
  let check: Awaited<ReturnType<typeof workerSlowdown>>;
  try {
    check = await workerSlowdown(page, await page.context().newCDPSession(page));
  } finally {
    await page.close();
  }
  expect(problems).toEqual([]);
  const { slowdown, fullSpeed, throttled } = check;
  workerCheck = { slowdown, benchTraceMs: throttled };
  const description = `bench trace ${fullSpeed} ms at full speed, ${throttled} ms throttled; worker readings scaled by ${slowdown}`;
  test.info().annotations.push({ type: 'worker throttling', description });
  console.log(`worker throttling check ${Date.now() - start} ms: ${description}`);
});

/**
 * Throttles the page to a CPU `throttleRate` times slower, opens `scene` with object `id`
 * selected, and returns the median of `timing` scaled by the worker's slowdown.
 */
async function medianTimingOnSlowerCpu(
  page: Page,
  scene: Scene,
  id: number,
  timing: Timing,
): Promise<number> {
  await throttle(await page.context().newCDPSession(page), throttleRate);
  await openForNudging(page, scene, id);
  return (await medianTiming(page, timing)) * workerCheck.slowdown;
}

test('the bench trace stays inside its budget at a 4x slower CPU', () => {
  const traceMs = workerCheck.benchTraceMs * workerCheck.slowdown;
  printReading('bench trace', traceMs, 20);
  expect(traceMs).toBeLessThan(20);
});

test('the dense-source bench trace stays inside its budget at a 4x slower CPU', async ({
  page,
}) => {
  const start = Date.now();
  const traceMs = await medianTimingOnSlowerCpu(page, benchWithDenseSource, 9, 'data-trace-ms');
  printReading('dense-source bench trace', traceMs, 60);
  expect(traceMs).toBeLessThan(60);
  // Kept under the 30 s test timeout, so a run drifting towards it fails here with its duration.
  expect(Date.now() - start).toBeLessThan(25_000);
});

test('the ball eye analysis stays inside its budget at a 4x slower CPU', async ({ page }) => {
  const start = Date.now();
  // Nudging the eye (id 3) reanalyses what it sees.
  const eyeMs = await medianTimingOnSlowerCpu(page, examples.ball, 3, 'data-eye-ms');
  printReading('ball eye', eyeMs, 100);
  expect(eyeMs).toBeLessThan(100);
  // Kept under the 30 s test timeout, so a run drifting towards it fails here with its duration.
  expect(Date.now() - start).toBeLessThan(25_000);
});

test('the magnifier eye analysis stays inside its budget at a 4x slower CPU', async ({ page }) => {
  const eyeMs = await medianTimingOnSlowerCpu(page, examples.magnifier, 3, 'data-eye-ms');
  test.info().annotations.push({ type: 'magnifier eye', description: `${eyeMs.toFixed(1)} ms` });
  printReading('magnifier eye', eyeMs, 100);
  expect(eyeMs).toBeLessThan(100);
});

test('the image arrows of a full scene stay inside their budget at a 4x slower CPU', async ({
  page,
}) => {
  // Nudging the first object (id 0) retraces the scene and finds its images again.
  const imagesMs = await medianTimingOnSlowerCpu(page, imageCapScene, 0, 'data-images-ms');
  test.info().annotations.push({ type: 'image arrows', description: `${imagesMs.toFixed(1)} ms` });
  printReading('image arrows', imagesMs, 55);
  // Twice the GitHub runner's worst reading, 25.6 ms, rounded up to a multiple of 5 ms.
  expect(imagesMs).toBeLessThan(55);
});

test('panning and zooming redraw within a frame and never retrace', async ({ page }) => {
  const session = await page.context().newCDPSession(page);
  await page.goto(await sceneUrl(examples.bench));
  await expectSceneShown(page, examples.bench);
  await expect.poll(() => traceCount(page)).toBeGreaterThan(0);
  await throttle(session, throttleRate);

  const box = await benchArea(page).boundingBox();
  if (!box) throw new Error('the bench is not on screen');
  // Empty bench above the objects, clear of the toolbar and the inspector.
  const start = { x: box.x + box.width / 2, y: box.y + 24 };
  const tracesBefore = await traceCount(page);
  const frameTimes: number[] = [];
  const pill = statusPill(page);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 30; step += 1) {
    await page.mouse.move(start.x + step * 4, start.y + step * 2);
    frameTimes.push(Number(await pill.getAttribute('data-frame-ms')));
  }
  await page.mouse.up();
  for (let notch = 0; notch < 10; notch += 1) {
    await page.mouse.wheel(0, notch < 5 ? -100 : 100);
    frameTimes.push(Number(await pill.getAttribute('data-frame-ms')));
  }

  const frameTimeP95 = percentile95(frameTimes);
  printReading('frame time p95', frameTimeP95, 16);
  expect(await traceCount(page)).toBe(tracesBefore);
  test.info().annotations.push({
    type: 'frame times',
    description: frameTimes.map((time) => time.toFixed(1)).join(' '),
  });
  expect(frameTimeP95).toBeLessThan(16);
});
