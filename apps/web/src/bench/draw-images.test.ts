import { type ImageArrow, imageLabel } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { drawImageArrows, drawImageLabels, type ImageContext } from './draw-images';
import { benchToScreen } from './view';

interface StrokedPath {
  points: Array<[number, number]>;
  dash: number[];
  lineWidth: number;
  strokeStyle: string;
}

/** Records the strokes and text the image drawing paints, as plain data. */
class RecordingContext implements ImageContext {
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';

  strokes: StrokedPath[] = [];
  texts: Array<{ text: string; x: number; y: number }> = [];
  private path: Array<[number, number]> = [];
  private dash: number[] = [];

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
    this.strokes.push({
      points: this.path,
      dash: this.dash,
      lineWidth: this.lineWidth,
      strokeStyle,
    });
  }
  fillText(text: string, x: number, y: number): void {
    this.texts.push({ text, x, y });
  }
}

function strokesThrough(
  context: RecordingContext,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return context.strokes.filter((stroke) => {
    const hasA = stroke.points.some(([x, y]) => x === a.x && y === a.y);
    const hasB = stroke.points.some(([x, y]) => x === b.x && y === b.y);
    return hasA && hasB;
  });
}

function alphaOf(style: string): number {
  const match = /rgba\([^)]*,\s*([\d.]+)\)$/.exec(style);
  return match ? Number(match[1]) : 1;
}

const pixel = 0.5;

const virtualImage: ImageArrow = {
  sourceId: 1,
  path: 'm0',
  kind: 'virtual',
  base: { x: 200, y: 0 },
  tip: { x: 200, y: -20 },
  baseFrom: { x: 100, y: 1 },
  tipFrom: { x: 100, y: -9 },
  blur: 0,
  magnification: 1,
};

const realImage: ImageArrow = {
  sourceId: 1,
  path: 't0t1',
  kind: 'real',
  base: { x: 300, y: 0 },
  tip: { x: 300, y: 12 },
  baseFrom: { x: 1, y: 0 },
  tipFrom: { x: 1, y: 0 },
  blur: 0,
  magnification: -0.6,
};

describe('drawImageArrows', () => {
  it('draws a virtual image dashed, with dashed extension lines back to the last surface', () => {
    const context = new RecordingContext();
    drawImageArrows(context, [virtualImage], pixel);
    const arrow = strokesThrough(context, virtualImage.base, virtualImage.tip);
    expect(arrow).toHaveLength(1);
    expect(arrow[0].dash.length).toBeGreaterThan(0);
    for (const [from, to] of [
      [virtualImage.baseFrom, virtualImage.base],
      [virtualImage.tipFrom, virtualImage.tip],
    ]) {
      const extension = strokesThrough(context, from, to);
      expect(extension).toHaveLength(1);
      expect(extension[0].dash.length).toBeGreaterThan(0);
    }
  });

  it('draws a real image solid, with no extension lines', () => {
    const context = new RecordingContext();
    drawImageArrows(context, [realImage], pixel);
    const arrow = strokesThrough(context, realImage.base, realImage.tip);
    expect(arrow).toHaveLength(1);
    expect(arrow[0].dash).toEqual([]);
    expect(strokesThrough(context, realImage.baseFrom, realImage.base)).toEqual([]);
  });

  it('lays a wider, translucent stroke under an image blurred over more than a pixel', () => {
    const context = new RecordingContext();
    drawImageArrows(context, [{ ...realImage, blur: 3 * pixel }], pixel);
    const [halo, arrow] = strokesThrough(context, realImage.base, realImage.tip);
    expect(halo.lineWidth).toBeGreaterThan(arrow.lineWidth);
    expect(alphaOf(halo.strokeStyle)).toBeLessThan(alphaOf(arrow.strokeStyle));
  });

  it('draws no wider stroke under a sharp image', () => {
    const context = new RecordingContext();
    drawImageArrows(context, [{ ...realImage, blur: pixel / 2 }], pixel);
    expect(strokesThrough(context, realImage.base, realImage.tip)).toHaveLength(1);
  });

  it('draws nothing without images', () => {
    const context = new RecordingContext();
    drawImageArrows(context, [], pixel);
    expect(context.strokes).toEqual([]);
  });
});

describe('drawImageLabels', () => {
  const view = { scale: 2, offsetX: 0, offsetY: 0 };
  const size = { width: 1200, height: 800 };

  it('writes the label of each image beside its tip on screen', () => {
    const context = new RecordingContext();
    drawImageLabels(context, [virtualImage, realImage], view, size);
    expect(context.texts.map((text) => text.text)).toEqual([
      imageLabel(virtualImage),
      imageLabel(realImage),
    ]);
    const tip = benchToScreen(realImage.tip, view, size);
    const label = context.texts[1];
    expect(Math.hypot(label.x - tip.x, label.y - tip.y)).toBeLessThan(20);
  });

  it('writes nothing without images', () => {
    const context = new RecordingContext();
    drawImageLabels(context, [], view, size);
    expect(context.texts).toEqual([]);
  });
});
