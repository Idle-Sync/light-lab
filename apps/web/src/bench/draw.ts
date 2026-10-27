import {
  type DetectorReading,
  type EyeAnalysis,
  type EyeGroup,
  type GridSettings,
  type RayBucket,
  refractiveIndex,
  type Scene,
  type SceneObject,
  type Spectrum,
  thickLensFocalLength,
} from '@light-lab/engine';
import type { SceneResults } from '../engine-worker';
import { analyzedEyeId, type View } from '../store';
import { faintestShownPower, spotAlpha, spotRadius, stripX } from './eye-strip';
import {
  arcMirrorShapeOf,
  degrees,
  extentOf,
  lensShapeOf,
  type Point,
  prismCornersOf,
  radians,
  rotateHandleOf,
  toBench,
} from './shapes';
import { benchToScreen, type CanvasSize, gridStepOnScreen, screenToBench } from './view';

/** The part of a 2D canvas context the bench drawing uses. */
export type BenchContext = Pick<
  CanvasRenderingContext2D,
  | 'globalCompositeOperation'
  | 'strokeStyle'
  | 'fillStyle'
  | 'lineWidth'
  | 'lineCap'
  | 'lineJoin'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'shadowBlur'
  | 'shadowColor'
  | 'save'
  | 'restore'
  | 'translate'
  | 'scale'
  | 'fillRect'
  | 'roundRect'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'arc'
  | 'closePath'
  | 'fill'
  | 'stroke'
  | 'setLineDash'
  | 'fillText'
  | 'createRadialGradient'
>;

export interface BenchFrame {
  scene: Scene;
  selectedId: number | null;
  view: View;
  results: SceneResults | null;
  size: CanvasSize;
}

type Rgb = [number, number, number];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const sodium = '#FFB547';
const chalk = '#E6E8EC';
const graphite = '#A3AAB6';
const labelFont = '500 12px "Instrument Sans Variable", system-ui, sans-serif';
// Catalogue glass data is quoted at the helium d line.
const dLine = 587.56;
// Images fainter than this share of the strongest one are left off the bench.
const faintestImageShare = 1e-4;

/** Display colour of a wavelength in nm, dimmed toward the ends of the visible range. */
export function wavelengthColor(nm: number): Rgb {
  let red = 0;
  let green = 0;
  let blue = 0;
  if (nm < 440) {
    red = (440 - nm) / 60;
    blue = 1;
  } else if (nm < 490) {
    green = (nm - 440) / 50;
    blue = 1;
  } else if (nm < 510) {
    green = 1;
    blue = (510 - nm) / 20;
  } else if (nm < 580) {
    red = (nm - 510) / 70;
    green = 1;
  } else if (nm < 645) {
    red = 1;
    green = (645 - nm) / 65;
  } else {
    red = 1;
  }
  let falloff = 1;
  if (nm < 420) falloff = 0.3 + (0.7 * (nm - 380)) / 40;
  if (nm > 700) falloff = 0.3 + (0.7 * (780 - nm)) / 80;
  const channel = (value: number) => Math.round(255 * Math.max(0, value * falloff) ** 0.8);
  return [channel(red), channel(green), channel(blue)];
}

function sourceColor(spectrum: Spectrum): Rgb {
  if (spectrum === 'white') return [255, 246, 230];
  return wavelengthColor(spectrum);
}

function rgba(color: Rgb, alpha: number | string): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

/** A share between 0 and 1 as a percentage, with more digits for smaller shares. */
export function formatPercent(share: number): string {
  const percent = share * 100;
  if (percent >= 10) return `${percent.toFixed(1)} %`;
  if (percent >= 0.1) return `${percent.toFixed(2)} %`;
  if (percent >= 0.001) return `${percent.toFixed(4)} %`;
  return `${percent.toExponential(1)} %`;
}

function formatLength(mm: number): string {
  if (Math.abs(mm) < 1) return `${(mm * 1000).toFixed(0)} µm`;
  return `${mm.toFixed(2)} mm`;
}

function spectrumName(spectrum: Spectrum): string {
  if (spectrum === 'white') return 'White';
  return `${spectrum} nm`;
}

/** Draws one frame of the bench: grid, rays, objects, image markers, labels and eye strip. */
export function drawBench(context: BenchContext, frame: BenchFrame): void {
  const { scene, view, size, results } = frame;
  const eyeAnalysis = shownEyeAnalysis(frame);
  context.globalCompositeOperation = 'source-over';
  context.shadowBlur = 0;
  context.fillStyle = '#000';
  context.fillRect(0, 0, size.width, size.height);
  drawGrid(context, view, size, scene.settings.grid);

  const pixel = 1 / view.scale;
  context.save();
  context.translate(
    size.width / 2 - view.offsetX * view.scale,
    size.height / 2 - view.offsetY * view.scale,
  );
  context.scale(view.scale, view.scale);
  context.lineWidth = pixel;
  if (results) drawRays(context, results.trace.buckets);
  const detectors = results ? results.trace.detectors : {};
  for (const object of scene.objects) {
    drawObject(context, object, pixel, object.id === frame.selectedId, detectors[object.id]);
  }
  if (eyeAnalysis) drawImageMarkers(context, eyeAnalysis, pixel);
  context.restore();

  drawLabels(context, frame, eyeAnalysis);
  if (eyeAnalysis) drawImageShareLabels(context, eyeAnalysis, view, size);
  const selected = scene.objects.find((object) => object.id === frame.selectedId);
  if (selected) drawRotateHandle(context, selected, view, size);
  drawEyePanel(context, frame, eyeAnalysis);
}

/** The eye analysis that belongs to the eye the app analyses now, or null when stale or absent. */
function shownEyeAnalysis(frame: BenchFrame): EyeAnalysis | null {
  const analysis = frame.results?.eye;
  if (!analysis) return null;
  if (analysis.eyeId !== analyzedEyeId(frame.scene, frame.selectedId)) return null;
  return analysis;
}

interface GridLine {
  from: Point;
  to: Point;
  major: boolean;
}

/** The grid lines across the canvas, in screen pixels; every fifth line is a major one. */
function gridLines(view: View, size: CanvasSize, gridSize: number): GridLine[] {
  const step = gridStepOnScreen(gridSize, view.scale);
  const topLeft = screenToBench({ x: 0, y: 0 }, view, size);
  const bottomRight = screenToBench({ x: size.width, y: size.height }, view, size);
  const lines: GridLine[] = [];
  for (let index = Math.ceil(topLeft.x / step); index * step <= bottomRight.x; index += 1) {
    const x = benchToScreen({ x: index * step, y: 0 }, view, size).x;
    lines.push({ from: { x, y: 0 }, to: { x, y: size.height }, major: index % 5 === 0 });
  }
  for (let index = Math.ceil(topLeft.y / step); index * step <= bottomRight.y; index += 1) {
    const y = benchToScreen({ x: 0, y: index * step }, view, size).y;
    lines.push({ from: { x: 0, y }, to: { x: size.width, y }, major: index % 5 === 0 });
  }
  return lines;
}

/** Faint grey grid lines under the rays, which add their light on top. */
export function drawGrid(
  context: BenchContext,
  view: View,
  size: CanvasSize,
  grid: GridSettings,
): void {
  if (!grid.show) return;
  const lines = gridLines(view, size, grid.size);
  context.lineWidth = 1;
  for (const major of [false, true]) {
    context.strokeStyle = major ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
    context.beginPath();
    for (const line of lines) {
      if (line.major !== major) continue;
      context.moveTo(line.from.x, line.from.y);
      context.lineTo(line.to.x, line.to.y);
    }
    context.stroke();
  }
}

/**
 * Strokes every ray segment as its own path with additive blending, so overlapping rays of
 * one colour add up and focus points glow. One stroke style per bucket.
 */
export function drawRays(context: BenchContext, buckets: Record<string, RayBucket>): void {
  context.globalCompositeOperation = 'lighter';
  context.lineCap = 'butt';
  for (const bucket of Object.values(buckets)) {
    context.strokeStyle = rgba(wavelengthColor(bucket.nm), bucket.alpha.toFixed(3));
    const points = bucket.points;
    for (let index = 0; index + 3 < points.length; index += 4) {
      context.beginPath();
      context.moveTo(points[index], points[index + 1]);
      context.lineTo(points[index + 2], points[index + 3]);
      context.stroke();
    }
  }
  context.globalCompositeOperation = 'source-over';
}

function drawObject(
  context: BenchContext,
  object: SceneObject,
  pixel: number,
  selected: boolean,
  reading: DetectorReading | undefined,
): void {
  context.lineJoin = 'round';
  context.lineCap = 'round';
  switch (object.kind) {
    case 'eye':
      drawEye(context, object, pixel, selected);
      return;
    case 'object':
      drawArrowObject(context, object, pixel, selected);
      return;
    case 'lens':
    case 'prism':
    case 'ball':
      drawGlass(context, object, pixel, selected);
      return;
    case 'arcMirror':
      drawArcMirror(context, object, pixel, selected);
      return;
    case 'point':
    case 'beam':
      drawSource(context, object, pixel, selected);
      return;
    case 'mirror':
      drawMirrorHatching(context, object, pixel);
      break;
    case 'detector':
      if (reading) drawDetectorBins(context, object, pixel, reading);
      break;
    case 'ruler':
      drawRulerTicks(context, object, pixel);
      break;
  }
  drawFlatBody(context, object, pixel, selected);
}

function drawEye(
  context: BenchContext,
  eye: Extract<SceneObject, { kind: 'eye' }>,
  pixel: number,
  selected: boolean,
): void {
  const facing = radians(eye.angle);
  const halfField = radians(eye.fieldOfView) / 2;
  context.fillStyle = 'rgba(255,181,71,0.06)';
  context.beginPath();
  context.moveTo(eye.x, eye.y);
  context.arc(eye.x, eye.y, 70 * pixel, facing - halfField, facing + halfField);
  context.closePath();
  context.fill();

  const ballRadius = Math.max(eye.pupil * 0.75, 8 * pixel);
  const ballCentre = toBench(eye, -ballRadius * 0.75, 0);
  context.beginPath();
  context.arc(ballCentre.x, ballCentre.y, ballRadius, 0, 2 * Math.PI);
  context.fillStyle = 'rgba(230,232,236,0.07)';
  context.fill();
  context.lineWidth = (selected ? 1.6 : 1) * pixel;
  context.strokeStyle = selected ? sodium : 'rgba(230,232,236,0.6)';
  context.stroke();

  const iris = toBench(eye, -ballRadius * 0.25, 0);
  context.fillStyle = selected ? sodium : chalk;
  context.beginPath();
  context.arc(iris.x, iris.y, Math.min(ballRadius * 0.35, eye.pupil / 2), 0, 2 * Math.PI);
  context.fill();

  const pupilTop = toBench(eye, 0, -eye.pupil / 2);
  const pupilBottom = toBench(eye, 0, eye.pupil / 2);
  context.strokeStyle = selected ? sodium : chalk;
  context.lineWidth = 2.5 * pixel;
  context.beginPath();
  context.moveTo(pupilTop.x, pupilTop.y);
  context.lineTo(pupilBottom.x, pupilBottom.y);
  context.stroke();
}

function drawArrowObject(
  context: BenchContext,
  arrow: Extract<SceneObject, { kind: 'object' }>,
  pixel: number,
  selected: boolean,
): void {
  const color = `rgb(${sourceColor(arrow.spectrum).join(',')})`;
  const tip = toBench(arrow, 0, -arrow.height);
  const headLeft = toBench(arrow, -4 * pixel, -arrow.height + 8 * pixel);
  const headRight = toBench(arrow, 4 * pixel, -arrow.height + 8 * pixel);
  context.shadowColor = color;
  context.shadowBlur = 10;
  context.strokeStyle = selected ? sodium : color;
  context.lineWidth = 2.5 * pixel;
  context.beginPath();
  context.moveTo(arrow.x, arrow.y);
  context.lineTo(tip.x, tip.y);
  context.moveTo(headLeft.x, headLeft.y);
  context.lineTo(tip.x, tip.y);
  context.lineTo(headRight.x, headRight.y);
  context.stroke();
  context.shadowBlur = 0;
}

function traceGlassOutline(
  context: BenchContext,
  glass: Extract<SceneObject, { kind: 'lens' | 'prism' | 'ball' }>,
): void {
  if (glass.kind === 'lens') {
    const lens = lensShapeOf(glass);
    const facing = radians(glass.angle);
    context.arc(
      lens.frontCentre.x,
      lens.frontCentre.y,
      glass.radius1,
      facing + Math.PI - lens.frontHalfAngle,
      facing + Math.PI + lens.frontHalfAngle,
    );
    context.arc(
      lens.backCentre.x,
      lens.backCentre.y,
      glass.radius2,
      facing - lens.backHalfAngle,
      facing + lens.backHalfAngle,
    );
    context.closePath();
    return;
  }
  if (glass.kind === 'prism') {
    const [apex, right, left] = prismCornersOf(glass);
    context.moveTo(apex.x, apex.y);
    context.lineTo(right.x, right.y);
    context.lineTo(left.x, left.y);
    context.closePath();
    return;
  }
  context.arc(glass.x, glass.y, glass.diameter / 2, 0, 2 * Math.PI);
}

function drawGlass(
  context: BenchContext,
  glass: Extract<SceneObject, { kind: 'lens' | 'prism' | 'ball' }>,
  pixel: number,
  selected: boolean,
): void {
  context.beginPath();
  traceGlassOutline(context, glass);
  context.fillStyle = 'rgba(150,180,235,0.08)';
  context.fill();
  context.lineWidth = (selected ? 1.6 : 1) * pixel;
  context.strokeStyle = selected ? sodium : 'rgba(175,198,240,0.5)';
  context.stroke();
}

function drawArcMirror(
  context: BenchContext,
  mirror: Extract<SceneObject, { kind: 'arcMirror' }>,
  pixel: number,
  selected: boolean,
): void {
  const arc = arcMirrorShapeOf(mirror);
  const backSide = mirror.form === 'concave' ? 1 : -1;
  const hatchCount = Math.max(4, Math.round((arc.radius * 2 * arc.halfAngle) / pixel / 7));
  context.lineWidth = pixel;
  context.strokeStyle = 'rgba(213,219,228,0.35)';
  context.beginPath();
  for (let index = 0; index <= hatchCount; index += 1) {
    const angle = arc.middleAngle - arc.halfAngle + (2 * arc.halfAngle * index) / hatchCount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = arc.centre.x + arc.radius * cos;
    const y = arc.centre.y + arc.radius * sin;
    context.moveTo(x, y);
    context.lineTo(
      x + backSide * 5 * pixel * cos - 3 * pixel * sin,
      y + backSide * 5 * pixel * sin + 3 * pixel * cos,
    );
  }
  context.stroke();
  context.beginPath();
  context.arc(
    arc.centre.x,
    arc.centre.y,
    arc.radius,
    arc.middleAngle - arc.halfAngle,
    arc.middleAngle + arc.halfAngle,
  );
  context.lineWidth = 2 * pixel;
  context.strokeStyle = selected ? sodium : '#D5DBE4';
  context.stroke();
}

function drawSource(
  context: BenchContext,
  source: Extract<SceneObject, { kind: 'point' | 'beam' }>,
  pixel: number,
  selected: boolean,
): void {
  const color = `rgb(${sourceColor(source.spectrum).join(',')})`;
  context.shadowColor = color;
  context.shadowBlur = 14;
  if (source.kind === 'point') {
    context.fillStyle = color;
    context.beginPath();
    context.arc(source.x, source.y, 4.5 * pixel, 0, 2 * Math.PI);
    context.fill();
  } else {
    const start = toBench(source, 0, -source.width / 2);
    const end = toBench(source, 0, source.width / 2);
    context.strokeStyle = color;
    context.lineWidth = 3 * pixel;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  context.shadowBlur = 0;
  if (!selected) return;

  context.strokeStyle = sodium;
  context.lineWidth = 1.5 * pixel;
  context.beginPath();
  if (source.kind === 'point') {
    context.arc(source.x, source.y, 9 * pixel, 0, 2 * Math.PI);
  } else {
    const start = toBench(source, -4 * pixel, -source.width / 2 - 4 * pixel);
    const end = toBench(source, -4 * pixel, source.width / 2 + 4 * pixel);
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
  }
  context.stroke();
}

function drawMirrorHatching(
  context: BenchContext,
  mirror: Extract<SceneObject, { kind: 'mirror' }>,
  pixel: number,
): void {
  context.lineWidth = pixel;
  context.strokeStyle = 'rgba(213,219,228,0.35)';
  context.beginPath();
  for (let along = -mirror.length / 2; along <= mirror.length / 2; along += 7 * pixel) {
    const start = toBench(mirror, along, 0);
    const end = toBench(mirror, along - 3 * pixel, 5 * pixel);
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
  }
  context.stroke();
}

/** One bar per detector bin, its length the bin's intensity and its colour the light's mix. */
function drawDetectorBins(
  context: BenchContext,
  detector: Extract<SceneObject, { kind: 'detector' }>,
  pixel: number,
  reading: DetectorReading,
): void {
  const { intensity, red, green, blue } = reading.bins;
  let peak = 0;
  for (const value of intensity) peak = Math.max(peak, value);
  if (peak <= 0) return;

  const binWidth = detector.length / intensity.length;
  const normalX = Math.sin(radians(detector.angle));
  const normalY = -Math.cos(radians(detector.angle));
  context.lineCap = 'butt';
  context.lineWidth = binWidth * 0.8;
  for (let bin = 0; bin < intensity.length; bin += 1) {
    if (intensity[bin] <= 0) continue;
    const brightest = Math.max(red[bin], green[bin], blue[bin]);
    const color: Rgb = [
      Math.round((255 * red[bin]) / brightest),
      Math.round((255 * green[bin]) / brightest),
      Math.round((255 * blue[bin]) / brightest),
    ];
    const base = toBench(detector, -detector.length / 2 + (bin + 0.5) * binWidth, 0);
    const barLength = 4 * pixel + (26 * pixel * intensity[bin]) / peak;
    context.strokeStyle = `rgb(${color.join(',')})`;
    context.beginPath();
    context.moveTo(base.x + normalX * 3 * pixel, base.y + normalY * 3 * pixel);
    context.lineTo(base.x + normalX * barLength, base.y + normalY * barLength);
    context.stroke();
  }
  context.lineCap = 'round';
}

function drawRulerTicks(
  context: BenchContext,
  ruler: Extract<SceneObject, { kind: 'ruler' }>,
  pixel: number,
): void {
  // Millimetre-scale ticks every 10 mm while they stay 6 px apart, else every 50 mm.
  const tickSpacing = 10 / pixel >= 6 ? 10 : 50;
  context.lineWidth = pixel;
  context.strokeStyle = 'rgba(255,255,255,0.55)';
  context.beginPath();
  for (let along = 0; along <= ruler.length + 1e-9; along += tickSpacing) {
    const tickLength = Math.abs(along % 50) < 1e-9 ? 8 : 4;
    const start = toBench(ruler, -ruler.length / 2 + along, 0);
    const end = toBench(ruler, -ruler.length / 2 + along, tickLength * pixel);
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
  }
  context.stroke();
}

const flatBodyWidths = { mirror: 2, detector: 3, blocker: 4.5, ruler: 1 };
const flatBodyColors = {
  mirror: '#D5DBE4',
  detector: 'rgba(150,165,190,0.95)',
  blocker: '#4A505C',
  ruler: 'rgba(255,255,255,0.7)',
};

function drawFlatBody(
  context: BenchContext,
  object: Extract<SceneObject, { kind: 'mirror' | 'detector' | 'blocker' | 'ruler' }>,
  pixel: number,
  selected: boolean,
): void {
  const start = toBench(object, -object.length / 2, 0);
  const end = toBench(object, object.length / 2, 0);
  context.lineWidth = flatBodyWidths[object.kind] * pixel;
  context.strokeStyle = selected ? sodium : flatBodyColors[object.kind];
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
}

function strongestGroupPower(analysis: EyeAnalysis): number {
  let strongest = 0;
  for (const group of analysis.groups) strongest = Math.max(strongest, group.power);
  return strongest;
}

/** Whether a group has an image point on the bench bright enough to mark. */
function hasMarkedImage(group: EyeGroup, strongest: number): boolean {
  if (!group.image) return false;
  if (group.kind !== 'real' && group.kind !== 'virtual') return false;
  return group.power >= strongest * faintestImageShare;
}

function chainKey(group: EyeGroup): string {
  return `${group.sourceId}|${group.nm}|${group.path}`;
}

/**
 * Marks where the eye sees each image, in bench coordinates. Virtual images get dashed lines
 * traced back from where the outermost rays cross the pupil (`low` and `high`, bench points);
 * images of the points of one source along one path are joined, dashed when virtual and solid
 * when real.
 */
export function drawImageMarkers(
  context: BenchContext,
  analysis: EyeAnalysis,
  pixel: number,
): void {
  const strongest = strongestGroupPower(analysis);
  const chains = new Map<string, Array<{ group: EyeGroup; image: [number, number] }>>();
  let shown = 0;
  for (const group of analysis.groups) {
    if (shown >= 80) break;
    const image = group.image;
    if (!image || !hasMarkedImage(group, strongest)) continue;
    shown += 1;
    const color = wavelengthColor(group.nm);
    if (group.kind === 'virtual' && group.low !== null && group.high !== null) {
      context.setLineDash([4 * pixel, 4 * pixel]);
      context.strokeStyle = rgba(color, 0.4);
      context.lineWidth = pixel;
      context.beginPath();
      context.moveTo(group.low[0], group.low[1]);
      context.lineTo(image[0], image[1]);
      context.moveTo(group.high[0], group.high[1]);
      context.lineTo(image[0], image[1]);
      context.stroke();
      context.setLineDash([]);
    }
    context.fillStyle = '#000';
    context.strokeStyle = rgba(color, 0.95);
    context.lineWidth = 1.5 * pixel;
    context.beginPath();
    context.arc(image[0], image[1], 3.5 * pixel, 0, 2 * Math.PI);
    context.fill();
    context.stroke();

    const chain = chains.get(chainKey(group)) ?? [];
    chain.push({ group, image });
    chains.set(chainKey(group), chain);
  }

  for (const chain of chains.values()) {
    if (chain.length < 2) continue;
    chain.sort((a, b) => a.group.pointIndex - b.group.pointIndex);
    const first = chain[0].group;
    context.strokeStyle = rgba(wavelengthColor(first.nm), 0.75);
    context.lineWidth = 1.5 * pixel;
    context.setLineDash(first.kind === 'virtual' ? [5 * pixel, 3 * pixel] : []);
    context.beginPath();
    context.moveTo(chain[0].image[0], chain[0].image[1]);
    for (const link of chain.slice(1)) context.lineTo(link.image[0], link.image[1]);
    context.stroke();
    context.setLineDash([]);
  }
}

/** Number of light paths bright enough to count, relative to the strongest group. */
function countedPaths(analysis: EyeAnalysis): number {
  const strongest = strongestGroupPower(analysis);
  let count = 0;
  for (const row of analysis.rows) {
    if (row.power >= strongest * faintestImageShare) count += 1;
  }
  return count;
}

function eyeLabel(eyeId: number, analysis: EyeAnalysis | null): string {
  if (!analysis || analysis.eyeId !== eyeId) return 'Eye';
  const count = countedPaths(analysis);
  if (count === 0) return 'Sees nothing';
  return `Sees ${count} light path${count > 1 ? 's' : ''}`;
}

/** The live readout shown under an object, or an empty string for none. */
function labelOf(
  object: SceneObject,
  reading: DetectorReading | undefined,
  analysis: EyeAnalysis | null,
): string {
  switch (object.kind) {
    case 'eye':
      return eyeLabel(object.id, analysis);
    case 'object':
      return `${spectrumName(object.spectrum)} object`;
    case 'point':
    case 'beam':
      return spectrumName(object.spectrum);
    case 'lens': {
      const focalLength = thickLensFocalLength(object, refractiveIndex(object.material, dLine));
      return `f ${focalLength.toFixed(1)} mm`;
    }
    case 'arcMirror': {
      const sign = object.form === 'concave' ? '' : '−';
      return `f ${sign}${(object.radius / 2).toFixed(1)} mm`;
    }
    case 'ball': {
      const index = refractiveIndex(object.material, dLine);
      return `f ${((index * object.diameter) / (4 * (index - 1))).toFixed(1)} mm`;
    }
    case 'prism':
      return `n ${refractiveIndex(object.material, dLine).toFixed(4)}`;
    case 'ruler':
      return `${object.length.toFixed(1)} mm`;
    case 'detector':
      if (!reading || reading.power <= 0) return 'No light';
      return `RMS ${formatLength(reading.rmsWidth)}`;
    default:
      return '';
  }
}

function drawLabels(context: BenchContext, frame: BenchFrame, analysis: EyeAnalysis | null): void {
  const detectors = frame.results ? frame.results.trace.detectors : {};
  context.font = labelFont;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  for (const object of frame.scene.objects) {
    const text = labelOf(object, detectors[object.id], analysis);
    if (!text) continue;
    const anchor = benchToScreen(
      { x: object.x, y: object.y + extentOf(object) },
      frame.view,
      frame.size,
    );
    context.fillStyle = object.id === frame.selectedId ? '#FFD08A' : graphite;
    context.fillText(text, anchor.x, anchor.y + 14);
  }
}

/** Beside the image of each of the five strongest paths, the share of light the path keeps. */
function drawImageShareLabels(
  context: BenchContext,
  analysis: EyeAnalysis,
  view: View,
  size: CanvasSize,
): void {
  const strongest = strongestGroupPower(analysis);
  context.font = labelFont;
  context.textAlign = 'left';
  context.textBaseline = 'bottom';
  context.fillStyle = chalk;
  for (const row of analysis.rows.slice(0, 5)) {
    const top = row.top;
    if (!top.image || !hasMarkedImage(top, strongest)) continue;
    const anchor = benchToScreen({ x: top.image[0], y: top.image[1] }, view, size);
    context.fillText(formatPercent(row.transmission), anchor.x + 8, anchor.y - 6);
  }
}

function drawRotateHandle(
  context: BenchContext,
  object: SceneObject,
  view: View,
  size: CanvasSize,
): void {
  const centre = benchToScreen(object, view, size);
  const handle = benchToScreen(rotateHandleOf(object, view.scale), view, size);
  context.strokeStyle = 'rgba(255,181,71,0.7)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centre.x, centre.y);
  context.lineTo(handle.x, handle.y);
  context.stroke();
  context.fillStyle = '#000';
  context.strokeStyle = sodium;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(handle.x, handle.y, 6, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
  context.fillStyle = sodium;
  context.beginPath();
  context.arc(centre.x, centre.y, 2.5, 0, 2 * Math.PI);
  context.fill();
}

function eyeSummary(analysis: EyeAnalysis | null): string {
  if (!analysis || analysis.groups.length === 0) return 'No light reaches the pupil';
  const count = countedPaths(analysis);
  return `${count} light path${count > 1 ? 's' : ''}, fixed exposure on a log scale`;
}

/** The panel above the status pill showing what the analysed eye sees, as the mockup lays it out. */
function drawEyePanel(
  context: BenchContext,
  frame: BenchFrame,
  analysis: EyeAnalysis | null,
): void {
  const eyeId = analyzedEyeId(frame.scene, frame.selectedId);
  const eye = frame.scene.objects.find((object) => object.id === eyeId);
  if (eye?.kind !== 'eye') return;

  const { width, height } = frame.size;
  const narrow = width < 760;
  const left = narrow ? 16 : 92;
  const right = narrow ? width - 16 : width - 332;
  const panelWidth = Math.min(760, right - left);
  const panelHeight = 134;
  const panel = {
    x: left + (right - left - panelWidth) / 2,
    y: height - 72 - panelHeight,
    width: panelWidth,
    height: panelHeight,
  };
  context.fillStyle = 'rgba(25,28,34,0.92)';
  context.strokeStyle = '#2C313B';
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(panel.x, panel.y, panel.width, panel.height, 14);
  context.fill();
  context.stroke();

  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.fillStyle = chalk;
  context.font = '600 14px "Instrument Sans Variable", system-ui, sans-serif';
  context.fillText('What the eye sees', panel.x + 14, panel.y + 12);
  context.textAlign = 'right';
  context.fillStyle = graphite;
  context.font = labelFont;
  context.fillText(eyeSummary(analysis), panel.x + panel.width - 14, panel.y + 14);

  const strip = { x: panel.x + 14, y: panel.y + 38, width: panel.width - 28, height: 60 };
  drawEyeStrip(context, analysis, eye.fieldOfView, strip);

  const halfField = Math.round(eye.fieldOfView / 2);
  const captionY = strip.y + strip.height + 8;
  context.font = labelFont;
  context.fillStyle = graphite;
  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.fillText(`Left ${halfField}°`, strip.x, captionY);
  context.textAlign = 'center';
  context.fillText('Straight ahead', strip.x + strip.width / 2, captionY);
  context.textAlign = 'right';
  context.fillText(`Right ${halfField}°`, strip.x + strip.width, captionY);
}

/**
 * What the eye sees, unrolled across its field of view. The exposure is fixed: a spot's size
 * never changes and its brightness depends only on the share of the source entering the
 * pupil, never on other paths. Labels give the share of light each strong path keeps.
 */
export function drawEyeStrip(
  context: BenchContext,
  analysis: EyeAnalysis | null,
  fieldOfView: number,
  strip: Rect,
): void {
  const middleY = strip.y + strip.height / 2;
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = '#000';
  context.beginPath();
  context.roundRect(strip.x, strip.y, strip.width, strip.height, 8);
  context.fill();
  context.strokeStyle = '#22262E';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(strip.x + strip.width / 2, strip.y);
  context.lineTo(strip.x + strip.width / 2, strip.y + strip.height);
  context.stroke();

  if (!analysis || analysis.groups.length === 0) {
    context.fillStyle = '#6B7380';
    context.font = labelFont;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      'No light reaches the pupil. Aim the eye at the optics.',
      strip.x + strip.width / 2,
      middleY,
    );
    return;
  }

  // Group angles are radians; the strip scale, like the field of view, is in degrees.
  const xOf = (angle: number) => strip.x + stripX(degrees(angle), fieldOfView, strip.width);
  const chains = new Map<string, EyeGroup[]>();
  context.globalCompositeOperation = 'lighter';
  for (const group of analysis.groups) {
    if (!group.visible || group.power < faintestShownPower) continue;
    const color = wavelengthColor(group.nm);
    const x = xOf(group.angle);
    const glow = context.createRadialGradient(x, middleY, 0, x, middleY, spotRadius);
    glow.addColorStop(0, rgba(color, spotAlpha(group.power)));
    glow.addColorStop(1, rgba(color, 0));
    context.fillStyle = glow;
    context.fillRect(x - spotRadius, middleY - spotRadius, 2 * spotRadius, 2 * spotRadius);
    const chain = chains.get(chainKey(group)) ?? [];
    chain.push(group);
    chains.set(chainKey(group), chain);
  }

  for (const chain of chains.values()) {
    if (chain.length < 2) continue;
    chain.sort((a, b) => a.pointIndex - b.pointIndex);
    drawStripChain(context, chain, xOf, middleY);
  }
  context.globalCompositeOperation = 'source-over';

  context.fillStyle = '#C9CED6';
  context.font = '500 11px "Instrument Sans Variable", system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  for (const row of analysis.rows.slice(0, 4)) {
    if (!row.top.visible) continue;
    context.fillText(
      formatPercent(row.transmission),
      xOf(row.top.angle),
      strip.y + strip.height - 2,
    );
  }
}

/** Joins the images of an extended object's points with an arrowhead at the last point. */
function drawStripChain(
  context: BenchContext,
  chain: EyeGroup[],
  xOf: (angle: number) => number,
  middleY: number,
): void {
  const first = chain[0];
  const color = rgba(wavelengthColor(first.nm), 0.8 * spotAlpha(first.power));
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(xOf(first.angle), middleY);
  for (const group of chain.slice(1)) context.lineTo(xOf(group.angle), middleY);
  context.stroke();

  const tipX = xOf(chain[chain.length - 1].angle);
  const beforeTipX = xOf(chain[chain.length - 2].angle);
  const direction = tipX > beforeTipX ? 1 : -1;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(tipX + direction * 8, middleY);
  context.lineTo(tipX - direction * 2, middleY - 7);
  context.lineTo(tipX - direction * 2, middleY + 7);
  context.closePath();
  context.fill();
}
