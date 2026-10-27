import {
  analyzeEye,
  type EyeAnalysis,
  type EyeGroup,
  type EyeRow,
  examples,
  type RayBucket,
  type Scene,
} from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import type { SceneResults } from '../engine-worker';
import {
  type BenchContext,
  drawBench,
  drawEyeStrip,
  drawGrid,
  drawImageMarkers,
  drawRays,
  formatPercent,
} from './draw';
import { faintestShownPower, spotAlpha, spotRadius, stripX } from './eye-strip';
import { degrees, radians } from './shapes';

interface StrokedPath {
  points: Array<[number, number]>;
  dash: number[];
  strokeStyle: string;
}

interface Spot {
  x: number;
  radius: number;
  innerColor: string;
}

/** Records what would be painted, as plain data. */
class RecordingContext implements BenchContext {
  globalCompositeOperation: GlobalCompositeOperation = 'source-over';
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  shadowBlur = 0;
  shadowColor = '';

  strokes: StrokedPath[] = [];
  strokeStyleChanges: string[] = [];
  compositeAtEachStroke: GlobalCompositeOperation[] = [];
  spots: Spot[] = [];
  texts: Array<{ text: string; x: number; y: number }> = [];
  private path: Array<[number, number]> = [];
  private dash: number[] = [];
  private currentStrokeStyle: string | CanvasGradient | CanvasPattern = '#000';

  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.currentStrokeStyle;
  }
  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    if (typeof value === 'string') this.strokeStyleChanges.push(value);
    this.currentStrokeStyle = value;
  }

  save(): void {}
  restore(): void {}
  translate(): void {}
  scale(): void {}
  fillRect(): void {}
  roundRect(): void {}
  closePath(): void {}
  fill(): void {}
  arc(): void {}
  beginPath(): void {
    this.path = [];
  }
  moveTo(x: number, y: number): void {
    this.path.push([x, y]);
  }
  lineTo(x: number, y: number): void {
    this.path.push([x, y]);
  }
  setLineDash(segments: number[]): void {
    this.dash = segments;
  }
  stroke(): void {
    const strokeStyle = typeof this.strokeStyle === 'string' ? this.strokeStyle : 'gradient';
    this.strokes.push({ points: this.path, dash: this.dash, strokeStyle });
    this.compositeAtEachStroke.push(this.globalCompositeOperation);
  }
  fillText(text: string, x: number, y: number): void {
    this.texts.push({ text, x, y });
  }
  createRadialGradient(
    x0: number,
    _y0: number,
    _r0: number,
    _x1: number,
    _y1: number,
    r1: number,
  ): CanvasGradient {
    const spot: Spot = { x: x0, radius: r1, innerColor: '' };
    this.spots.push(spot);
    return {
      addColorStop(offset: number, color: string): void {
        if (offset === 0) spot.innerColor = color;
      },
    };
  }
}

function eyeGroup(overrides: Partial<EyeGroup>): EyeGroup {
  return {
    sourceId: 1,
    pointIndex: 0,
    nm: 532,
    path: 'tt',
    power: 0.01,
    rayCount: 20,
    transmission: 0.9,
    kind: 'real',
    image: [0, 0],
    distance: 100,
    angle: 0,
    visible: true,
    low: null,
    high: null,
    ...overrides,
  };
}

function eyeRow(top: EyeGroup, transmission: number): EyeRow {
  return {
    path: top.path,
    power: top.power,
    transmission,
    rayCount: top.rayCount,
    color: [0, 255, 0],
    top,
  };
}

function analysisOf(groups: EyeGroup[], rows: EyeRow[] = []): EyeAnalysis {
  let total = 0;
  for (const group of groups) total += group.power;
  return { eyeId: 9, groups, rows, totalIntoPupil: total };
}

function strokeThrough(context: RecordingContext, a: [number, number], b: [number, number]) {
  return context.strokes.find((stroke) => {
    const hasA = stroke.points.some(([x, y]) => x === a[0] && y === a[1]);
    const hasB = stroke.points.some(([x, y]) => x === b[0] && y === b[1]);
    return hasA && hasB;
  });
}

describe('drawGrid', () => {
  const view = { scale: 2, offsetX: 3, offsetY: -7 };
  const canvas = { width: 800, height: 600 };

  it('draws nothing when the grid is off', () => {
    const context = new RecordingContext();
    drawGrid(context, view, canvas, { show: false, size: 10, snap: false });
    expect(context.strokes).toEqual([]);
  });

  it('draws lines through the bench points that sit on the grid', () => {
    const context = new RecordingContext();
    drawGrid(context, view, canvas, { show: true, size: 10, snap: false });
    const verticalXs = new Set<number>();
    for (const stroke of context.strokes) {
      for (let index = 0; index + 1 < stroke.points.length; index += 2) {
        const [start, end] = [stroke.points[index], stroke.points[index + 1]];
        if (start[0] === end[0]) verticalXs.add(start[0]);
      }
    }
    expect(verticalXs.size).toBeGreaterThan(30);
    for (const x of verticalXs) {
      const benchX = (x - canvas.width / 2) / view.scale + view.offsetX;
      expect(Math.abs(benchX / 10 - Math.round(benchX / 10))).toBeLessThan(1e-6);
    }
  });

  // The grid sits under the rays, which add their light on top of it, so it stays faint.
  it('keeps every line faint', () => {
    const context = new RecordingContext();
    drawGrid(context, view, canvas, { show: true, size: 10, snap: false });
    for (const stroke of context.strokes) {
      const alpha = Number(/,([\d.]+)\)$/.exec(stroke.strokeStyle)?.[1]);
      expect(alpha).toBeLessThanOrEqual(0.08);
    }
  });

  it('draws a bounded number of lines whatever the grid size', () => {
    const context = new RecordingContext();
    drawGrid(context, { scale: 0.05, offsetX: 0, offsetY: 0 }, canvas, {
      show: true,
      size: 0.01,
      snap: false,
    });
    let lines = 0;
    for (const stroke of context.strokes) lines += stroke.points.length / 2;
    expect(lines).toBeLessThanOrEqual((canvas.width + canvas.height) / 8 + 4);
  });
});

describe('drawRays', () => {
  const buckets: Record<string, RayBucket> = {
    '532': { nm: 532, alpha: 0.4, points: [0, 0, 10, 0, 10, 0, 20, 5] },
    '650': { nm: 650, alpha: 0.25, points: [0, 1, 10, 1, 10, 1, 20, -5] },
  };

  it('strokes every segment additively as its own path', () => {
    const context = new RecordingContext();
    drawRays(context, buckets);
    expect(context.strokes.map((stroke) => stroke.points)).toEqual([
      [
        [0, 0],
        [10, 0],
      ],
      [
        [10, 0],
        [20, 5],
      ],
      [
        [0, 1],
        [10, 1],
      ],
      [
        [10, 1],
        [20, -5],
      ],
    ]);
    expect(new Set(context.compositeAtEachStroke)).toEqual(new Set(['lighter']));
  });

  it('sets one stroke style per bucket', () => {
    const context = new RecordingContext();
    drawRays(context, buckets);
    expect(context.strokeStyleChanges).toHaveLength(2);
    expect(context.strokeStyleChanges[0]).toMatch(/,0\.400\)$/);
  });
});

describe('drawImageMarkers', () => {
  const virtualNear = eyeGroup({
    path: 'tt',
    kind: 'virtual',
    image: [10, 0],
    low: [100, 3],
    high: [100, -3],
    pointIndex: 0,
    power: 0.05,
  });
  const virtualFar = eyeGroup({
    path: 'tt',
    kind: 'virtual',
    image: [10, 20],
    low: [100, 2],
    high: [100, -2],
    pointIndex: 1,
    power: 0.05,
  });
  const realNear = eyeGroup({ path: 'ttm', kind: 'real', image: [-30, 0], pointIndex: 0 });
  const realFar = eyeGroup({ path: 'ttm', kind: 'real', image: [-30, 15], pointIndex: 1 });
  const analysis = analysisOf([virtualNear, virtualFar, realNear, realFar]);

  it('draws a virtual image chain dashed', () => {
    const context = new RecordingContext();
    drawImageMarkers(context, analysis, 0.5);
    const chain = strokeThrough(context, [10, 0], [10, 20]);
    expect(chain?.dash.length).toBeGreaterThan(0);
  });

  it('draws the traced-back rays of a virtual image dashed', () => {
    const context = new RecordingContext();
    drawImageMarkers(context, analysis, 0.5);
    const backTrace = strokeThrough(context, [100, 3], [10, 0]);
    expect(backTrace?.dash.length).toBeGreaterThan(0);
  });

  it('leaves the traced-back rays out when sight lines are off, keeping the image', () => {
    const context = new RecordingContext();
    drawImageMarkers(context, analysis, 0.5, false);
    expect(strokeThrough(context, [100, 3], [10, 0])).toBeUndefined();
    expect(strokeThrough(context, [10, 0], [10, 20])).toBeDefined();
  });

  it('draws a real image chain solid', () => {
    const context = new RecordingContext();
    drawImageMarkers(context, analysis, 0.5);
    const chain = strokeThrough(context, [-30, 0], [-30, 15]);
    expect(chain).toBeDefined();
    expect(chain?.dash).toEqual([]);
  });

  it('skips groups with no image point or one at infinity', () => {
    const context = new RecordingContext();
    const atInfinity = eyeGroup({ kind: 'infinity', image: null });
    drawImageMarkers(context, analysisOf([atInfinity]), 0.5);
    expect(context.strokes).toEqual([]);
  });
});

describe('drawEyeStrip', () => {
  const rect = { x: 100, y: 500, width: 400, height: 60 };

  it('places each visible group by its angle', () => {
    const context = new RecordingContext();
    const group = eyeGroup({ angle: radians(10) });
    drawEyeStrip(context, analysisOf([group]), 70, rect);
    expect(context.spots).toHaveLength(1);
    expect(context.spots[0].x).toBeCloseTo(rect.x + stripX(10, 70, rect.width), 9);
  });

  it('uses a fixed exposure: a spot keeps its size and brightness whatever else is in view', () => {
    const faint = eyeGroup({ power: 0.01, path: 't' });
    const bright = eyeGroup({ power: 0.5, path: 'tt', angle: radians(20) });
    const alone = new RecordingContext();
    drawEyeStrip(alone, analysisOf([faint]), 70, rect);
    const withBright = new RecordingContext();
    drawEyeStrip(withBright, analysisOf([bright, faint]), 70, rect);

    const faintAlone = alone.spots[0];
    const faintBesideBright = withBright.spots.find((spot) => spot.x === faintAlone.x);
    expect(faintBesideBright).toEqual(faintAlone);
    expect(faintAlone.radius).toBe(spotRadius);
    expect(faintAlone.innerColor).toMatch(new RegExp(`,${spotAlpha(0.01)}\\)$`));
  });

  it('leaves out groups outside the field of view', () => {
    const context = new RecordingContext();
    drawEyeStrip(context, analysisOf([eyeGroup({ visible: false })]), 70, rect);
    expect(context.spots).toEqual([]);
  });

  it('labels each visible path with the share of light it keeps', () => {
    const context = new RecordingContext();
    const top = eyeGroup({ angle: radians(-10) });
    drawEyeStrip(context, analysisOf([top], [eyeRow(top, 0.917)]), 70, rect);
    const label = context.texts.find((text) => text.text === '91.7 %');
    expect(label?.x).toBeCloseTo(rect.x + stripX(-10, 70, rect.width), 9);
  });

  it('says so when no light reaches the pupil', () => {
    const context = new RecordingContext();
    drawEyeStrip(context, null, 70, rect);
    expect(context.texts.map((text) => text.text)).toEqual([
      'No light reaches the pupil. Aim the eye at the optics.',
    ]);
  });
});

function eyeOf(scene: Scene) {
  const eye = scene.objects.find((object) => object.kind === 'eye');
  if (eye?.kind !== 'eye') throw new Error('the example has no eye');
  return eye;
}

describe('eye drawing fed by the engine', () => {
  const rect = { x: 100, y: 500, width: 400, height: 60 };

  it('places every ball spot at the strip position of its angle in degrees', () => {
    const eye = eyeOf(examples.ball);
    const analysis = analyzeEye(examples.ball, eye.id);
    const context = new RecordingContext();
    drawEyeStrip(context, analysis, eye.fieldOfView, rect);

    const expected = analysis.groups
      .filter((group) => group.visible && group.power >= faintestShownPower)
      .map((group) => rect.x + stripX(degrees(group.angle), eye.fieldOfView, rect.width));
    expect(expected.length).toBeGreaterThan(0);
    expect(context.spots.map((spot) => spot.x)).toEqual(expected);
  });

  it('starts the magnifier back-traced lines at the pupil points low and high', () => {
    const eye = eyeOf(examples.magnifier);
    const analysis = analyzeEye(examples.magnifier, eye.id);
    const context = new RecordingContext();
    drawImageMarkers(context, analysis, 0.5);

    const virtual = analysis.groups.filter(
      (group) => group.kind === 'virtual' && group.image && group.low && group.high,
    );
    expect(virtual.length).toBeGreaterThan(0);
    for (const group of virtual.slice(0, 5)) {
      if (!group.image || !group.low || !group.high) continue;
      for (const entry of [group.low, group.high]) {
        expect(Math.hypot(entry[0] - eye.x, entry[1] - eye.y)).toBeLessThanOrEqual(eye.pupil / 2);
        const line = strokeThrough(context, entry, group.image);
        expect(line?.dash.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('formatPercent', () => {
  it('keeps more digits for smaller shares', () => {
    expect(formatPercent(0.917)).toBe('91.7 %');
    expect(formatPercent(0.0421)).toBe('4.21 %');
    expect(formatPercent(0.00001234)).toBe('0.0012 %');
    expect(formatPercent(1e-9)).toBe('1.0e-7 %');
  });
});

describe('drawBench', () => {
  const everyKind: Scene = {
    ...examples.bench,
    objects: [
      ...examples.bench.objects,
      { kind: 'mirror', id: 10, x: 0, y: 0, angle: 45, length: 60 },
      { kind: 'ball', id: 11, x: 40, y: 0, angle: 0, diameter: 30, material: 'bk7' },
      { kind: 'blocker', id: 12, x: 80, y: 0, angle: 90, length: 40 },
      {
        kind: 'object',
        id: 13,
        x: 120,
        y: 0,
        angle: 0,
        height: 20,
        cone: 40,
        rays: 9,
        spectrum: 589.3,
      },
      {
        kind: 'arcMirror',
        id: 14,
        x: 160,
        y: 0,
        angle: 0,
        radius: 100,
        diameter: 40,
        form: 'convex',
      },
      { kind: 'eye', id: 15, x: 200, y: 0, angle: 180, pupil: 8, fieldOfView: 70 },
    ],
  };

  function results(eye: EyeAnalysis | null): SceneResults {
    const intensity = new Float64Array([0, 1, 2]);
    return {
      trace: {
        buckets: { '532': { nm: 532, alpha: 0.3, points: [0, 0, 10, 0] } },
        detectors: {
          3: {
            power: 0.2,
            centroid: 0,
            rmsWidth: 0.25,
            hits: 40,
            bins: { intensity, red: intensity, green: intensity, blue: intensity },
          },
        },
        segmentCount: 1,
      },
      eye,
      traceMs: 1,
      eyeMs: 1,
    };
  }

  it('draws every kind of object with readouts and an eye strip', () => {
    const context = new RecordingContext();
    const top = eyeGroup({
      kind: 'virtual',
      image: [150, 0],
      low: [200, 2],
      high: [200, -2],
    });
    const eye = { ...analysisOf([top], [eyeRow(top, 0.5)]), eyeId: 15 };
    drawBench(context, {
      scene: everyKind,
      selectedId: 2,
      view: { scale: 2, offsetX: 0, offsetY: 0 },
      results: results(eye),
      size: { width: 1200, height: 800 },
    });
    const texts = context.texts.map((text) => text.text);
    expect(texts).toContain('RMS 250 µm');
    expect(texts).toContain('Sees 1 light path');
    expect(texts).toContain('589.3 nm object');
    expect(texts.some((text) => /^f \d+\.\d mm$/.test(text))).toBe(true);
    expect(texts).toContain('What the eye sees');
    expect(texts).toContain('Virtual image, 50.0 %');
    expect(context.spots).toHaveLength(1);
  });

  it('marks the focal points of the selected lens', () => {
    const context = new RecordingContext();
    drawBench(context, {
      scene: examples.bench,
      selectedId: 2,
      view: { scale: 2, offsetX: 0, offsetY: 0 },
      results: null,
      size: { width: 1200, height: 800 },
    });
    expect(context.texts.filter((text) => text.text === 'F')).toHaveLength(2);
  });

  it('marks no focal points for a selected object without one', () => {
    const context = new RecordingContext();
    drawBench(context, {
      scene: examples.bench,
      selectedId: 3,
      view: { scale: 2, offsetX: 0, offsetY: 0 },
      results: null,
      size: { width: 1200, height: 800 },
    });
    expect(context.texts.filter((text) => text.text === 'F')).toHaveLength(0);
  });

  it('draws the bench before any trace result arrives', () => {
    const context = new RecordingContext();
    drawBench(context, {
      scene: examples.bench,
      selectedId: null,
      view: { scale: 2, offsetX: 0, offsetY: 0 },
      results: null,
      size: { width: 1200, height: 800 },
    });
    expect(context.strokes.length).toBeGreaterThan(0);
  });
});
