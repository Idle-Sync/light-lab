import { examples } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { extentOf } from './shapes';
import {
  benchToScreen,
  fitView,
  freeArea,
  gridStepOnScreen,
  maxScale,
  screenToBench,
  zoomAt,
} from './view';

const size = { width: 1200, height: 800 };

describe('bench and screen coordinates', () => {
  it('puts the view offset at the canvas centre', () => {
    const view = { scale: 3, offsetX: 10, offsetY: -20 };
    expect(benchToScreen({ x: 10, y: -20 }, view, size)).toEqual({ x: 600, y: 400 });
  });

  it('round-trips a point through screen space', () => {
    const view = { scale: 2.5, offsetX: -40, offsetY: 15 };
    const screen = benchToScreen({ x: 33, y: -71 }, view, size);
    const bench = screenToBench(screen, view, size);
    expect(bench.x).toBeCloseTo(33, 9);
    expect(bench.y).toBeCloseTo(-71, 9);
  });
});

describe('zoomAt', () => {
  it('keeps the bench point under the cursor fixed', () => {
    const view = { scale: 2, offsetX: 30, offsetY: -12 };
    const cursor = { x: 210, y: 590 };
    const before = screenToBench(cursor, view, size);
    const zoomed = zoomAt(view, 1.7, cursor, size);
    const after = screenToBench(cursor, zoomed, size);
    expect(zoomed.scale).toBeCloseTo(3.4, 9);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it('keeps the point fixed when the scale hits its limit', () => {
    const view = { scale: 20, offsetX: 0, offsetY: 0 };
    const cursor = { x: 1000, y: 100 };
    const before = screenToBench(cursor, view, size);
    const zoomed = zoomAt(view, 1000, cursor, size);
    const after = screenToBench(cursor, zoomed, size);
    expect(zoomed.scale).toBe(maxScale);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });
});

describe('fitView', () => {
  // The free area is the canvas minus the floating toolbar, inspector and bottom controls.
  for (const canvas of [size, { width: 390, height: 844 }]) {
    it(`fits every object of the bench example inside the free area of ${canvas.width}x${canvas.height}`, () => {
      const view = fitView(examples.bench.objects, canvas);
      const area = freeArea(canvas);
      for (const object of examples.bench.objects) {
        const extent = extentOf(object);
        const topLeft = benchToScreen({ x: object.x - extent, y: object.y - extent }, view, canvas);
        const bottomRight = benchToScreen(
          { x: object.x + extent, y: object.y + extent },
          view,
          canvas,
        );
        expect(topLeft.x).toBeGreaterThanOrEqual(area.left - 1e-9);
        expect(topLeft.y).toBeGreaterThanOrEqual(area.top - 1e-9);
        expect(bottomRight.x).toBeLessThanOrEqual(area.right + 1e-9);
        expect(bottomRight.y).toBeLessThanOrEqual(area.bottom + 1e-9);
      }
    });
  }

  it('shows 200 mm around the origin for an empty bench', () => {
    const view = fitView([], size);
    const area = freeArea(size);
    const centre = screenToBench(
      { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 },
      view,
      size,
    );
    expect(centre.x).toBeCloseTo(0, 9);
    expect(centre.y).toBeCloseTo(0, 9);
  });
});

describe('gridStepOnScreen', () => {
  it('draws the chosen grid size when its lines are far enough apart', () => {
    expect(gridStepOnScreen(10, 2)).toBe(10);
  });

  // A 0.01 mm grid zoomed out would be millions of lines: too slow to draw and a grey wash.
  it('draws every fifth line, repeatedly, until lines are at least 8 px apart', () => {
    expect(gridStepOnScreen(1, 2)).toBe(5);
    expect(gridStepOnScreen(0.01, 0.05)).toBeCloseTo(0.01 * 5 ** 7, 9);
  });

  it('keeps every drawn line on a grid line objects snap to', () => {
    const step = gridStepOnScreen(2.5, 0.3);
    expect(Math.abs(Math.round(step / 2.5) - step / 2.5)).toBeLessThan(1e-9);
  });
});
