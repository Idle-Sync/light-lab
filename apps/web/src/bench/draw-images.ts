import { type ImageArrow, imageLabel, type Point } from '@light-lab/engine';
import type { View } from '../store';
import { benchToScreen, type CanvasSize } from './view';

/** The part of a 2D canvas context the image arrows and their labels use. */
export type ImageContext = Pick<
  CanvasRenderingContext2D,
  | 'strokeStyle'
  | 'fillStyle'
  | 'lineWidth'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'stroke'
  | 'setLineDash'
  | 'fillText'
>;

const arrowColor = 'rgba(230,232,236,0.9)';
const extensionColor = 'rgba(230,232,236,0.4)';
const blurColor = 'rgba(230,232,236,0.15)';
const labelColor = '#E6E8EC';
// The same font as the object readouts in draw.ts.
const labelFont = '500 12px "Instrument Sans Variable", system-ui, sans-serif';

/**
 * Draws each image as an arrow from `base` to `tip`, in bench coordinates: dashed with dashed
 * extension lines back to where its rays left the last surface when virtual, solid when real,
 * over a wider translucent stroke as wide as its blur when that exceeds a pixel.
 */
export function drawImageArrows(context: ImageContext, images: ImageArrow[], pixel: number): void {
  for (const image of images) {
    if (image.blur > pixel) {
      context.setLineDash([]);
      context.strokeStyle = blurColor;
      context.lineWidth = 2 * image.blur;
      strokeArrow(context, image, pixel);
    }
    if (image.kind === 'virtual') {
      context.setLineDash([4 * pixel, 4 * pixel]);
      context.strokeStyle = extensionColor;
      context.lineWidth = pixel;
      strokeLine(context, image.baseFrom, image.base);
      strokeLine(context, image.tipFrom, image.tip);
    }
    context.setLineDash(image.kind === 'virtual' ? [5 * pixel, 3 * pixel] : []);
    context.strokeStyle = arrowColor;
    context.lineWidth = 1.5 * pixel;
    strokeArrow(context, image, pixel);
    context.setLineDash([]);
  }
}

function strokeLine(context: ImageContext, from: Point, to: Point): void {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
}

/** One path for the shaft and the head, the head 8 px long and 8 px wide. */
function strokeArrow(context: ImageContext, image: ImageArrow, pixel: number): void {
  const { base, tip } = image;
  context.beginPath();
  context.moveTo(base.x, base.y);
  context.lineTo(tip.x, tip.y);
  const length = Math.hypot(tip.x - base.x, tip.y - base.y);
  if (length > 0) {
    const alongX = (tip.x - base.x) / length;
    const alongY = (tip.y - base.y) / length;
    const backX = tip.x - alongX * 8 * pixel;
    const backY = tip.y - alongY * 8 * pixel;
    context.moveTo(backX - alongY * 4 * pixel, backY + alongX * 4 * pixel);
    context.lineTo(tip.x, tip.y);
    context.lineTo(backX + alongY * 4 * pixel, backY - alongX * 4 * pixel);
  }
  context.stroke();
}

/** Writes each image's label beside its tip, in screen pixels. */
export function drawImageLabels(
  context: ImageContext,
  images: ImageArrow[],
  view: View,
  size: CanvasSize,
): void {
  context.font = labelFont;
  context.textAlign = 'left';
  context.textBaseline = 'bottom';
  context.fillStyle = labelColor;
  for (const image of images) {
    const anchor = benchToScreen(image.tip, view, size);
    context.fillText(imageLabel(image), anchor.x + 8, anchor.y - 6);
  }
}
