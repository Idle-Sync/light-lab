import {
  type EyeAnalysis,
  type EyeGroup,
  type EyeRow,
  examples,
  type RayBucket,
  type Scene,
  type SceneObject,
} from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import type { SceneResults } from '../engine-worker';
import {
  type BenchContext,
  drawBench,
  drawEyeStrip,
  drawImageMarkers,
  drawRays,
  formatPercent,
} from './draw';
import { spotAlpha, spotRadius, stripX } from './eye-strip';
import { toBench } from './shapes';

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
    low: -3,
    high: 3,
    pointIndex: 0,
    power: 0.05,
  });
  const virtualFar = eyeGroup({
    path: 'tt',
    kind: 'virtual',
    image: [10, 20],
    low: -2,
    high: 2,
    pointIndex: 1,
    power: 0.05,
  });
  const realNear = eyeGroup({ path: 'ttm', kind: 'real', image: [-30, 0], pointIndex: 0 });
  const realFar = eyeGroup({ path: 'ttm', kind: 'real', image: [-30, 15], pointIndex: 1 });
  const analysis = analysisOf([virtualNear, virtualFar, realNear, realFar]);
  const eye = {
    kind: 'eye',
    id: 9,
    x: 100,
    y: 0,
    angle: 180,
    pupil: 8,
    fieldOfView: 70,
  } satisfies SceneObject;

  it('draws a virtual image chain dashed', () => {
    const context = new RecordingContext();
    drawImageMarkers(context, analysis, eye, 0.5);
    const chain = strokeThrough(context, [10, 0], [10, 20]);
    expect(chain?.dash.length).toBeGreaterThan(0);
  });

  it('draws the traced-back rays of a virtual image dashed', () => {
    const context = new RecordingContext();
    drawImageMarkers(context, analysis, eye, 0.5);
    const lowEntry = toBench(eye, 0, -3);
    const backTrace = strokeThrough(context, [lowEntry.x, lowEntry.y], [10, 0]);
    expect(backTrace?.dash.length).toBeGreaterThan(0);
  });

  it('draws a real image chain solid', () => {
    const context = new RecordingContext();
    drawImageMarkers(context, analysis, eye, 0.5);
    const chain = strokeThrough(context, [-30, 0], [-30, 15]);
    expect(chain).toBeDefined();
    expect(chain?.dash).toEqual([]);
  });

  it('skips groups with no image point or one at infinity', () => {
    const context = new RecordingContext();
    const atInfinity = eyeGroup({ kind: 'infinity', image: null });
    drawImageMarkers(context, analysisOf([atInfinity]), eye, 0.5);
    expect(context.strokes).toEqual([]);
  });
});

describe('drawEyeStrip', () => {
  const rect = { x: 100, y: 500, width: 400, height: 60 };

  it('places each visible group by its angle', () => {
    const context = new RecordingContext();
    const group = eyeGroup({ angle: 10 });
    drawEyeStrip(context, analysisOf([group]), 70, rect);
    expect(context.spots).toHaveLength(1);
    expect(context.spots[0].x).toBeCloseTo(rect.x + stripX(10, 70, rect.width), 9);
  });

  it('uses a fixed exposure: a spot keeps its size and brightness whatever else is in view', () => {
    const faint = eyeGroup({ power: 0.01, path: 't' });
    const bright = eyeGroup({ power: 0.5, path: 'tt', angle: 20 });
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
    const top = eyeGroup({ angle: -10 });
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
    const top = eyeGroup({ kind: 'virtual', image: [150, 0], low: -2, high: 2 });
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
    expect(context.spots).toHaveLength(1);
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
