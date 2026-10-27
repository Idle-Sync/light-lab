import { examples, type Scene } from '@light-lab/engine';
import type { CDPSession, Page } from '@playwright/test';
import { benchArea, expectSceneShown, sceneUrl, selectObject } from './bench';
import { expect, test } from './test';

const throttleRate = 4;
const warmUpTraces = 3;
const measuredTraces = 5;

type Timing = 'data-trace-ms' | 'data-eye-ms';

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
 * The factor that turns the engine worker's timings into timings on a CPU `throttleRate` times
 * slower, after checking whether page throttling reaches the worker. Chromium throttles only a
 * page's main thread and refuses the command on worker targets ("Operation is only supported
 * for pages, not workers"); when the worker does not slow down, its readings are scaled.
 */
async function workerSlowdown(page: Page, session: CDPSession): Promise<number> {
  // The ruler (id 9) changes no ray, so nudging it retraces the same bench.
  await openForNudging(page, examples.bench, 9);
  const fullSpeed = await medianTiming(page, 'data-trace-ms');
  await throttle(session, throttleRate);
  const throttled = await medianTiming(page, 'data-trace-ms');
  const slowdown = throttled >= 2 * fullSpeed ? 1 : throttleRate;
  test.info().annotations.push({
    type: 'worker throttling',
    description: `bench trace ${fullSpeed} ms at full speed, ${throttled} ms throttled; worker readings scaled by ${slowdown}`,
  });
  return slowdown;
}

test('the engine stays inside its budget at a 4x slower CPU', async ({ page }) => {
  const slowdown = await workerSlowdown(page, await page.context().newCDPSession(page));

  await openForNudging(page, examples.bench, 9);
  expect((await medianTiming(page, 'data-trace-ms')) * slowdown).toBeLessThan(20);

  await openForNudging(page, benchWithDenseSource, 9);
  expect((await medianTiming(page, 'data-trace-ms')) * slowdown).toBeLessThan(60);

  // Nudging the eye (id 3) reanalyses what it sees.
  await openForNudging(page, examples.ball, 3);
  expect((await medianTiming(page, 'data-eye-ms')) * slowdown).toBeLessThan(100);
});

test('the magnifier eye analysis stays inside its budget at a 4x slower CPU', async ({ page }) => {
  const slowdown = await workerSlowdown(page, await page.context().newCDPSession(page));
  await openForNudging(page, examples.magnifier, 3);
  expect((await medianTiming(page, 'data-eye-ms')) * slowdown).toBeLessThan(100);
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

  expect(await traceCount(page)).toBe(tracesBefore);
  test.info().annotations.push({
    type: 'frame times',
    description: frameTimes.map((time) => time.toFixed(1)).join(' '),
  });
  expect(percentile95(frameTimes)).toBeLessThan(16);
});
