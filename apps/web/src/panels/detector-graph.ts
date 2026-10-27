import type { DetectorReading } from '@light-lab/engine';

const tickSteps = [1, 2, 5, 10, 20, 50, 100];
const mostTicks = 10;

function peakOf(values: Float64Array): number {
  return Math.max(...values);
}

/** One CSS colour per bin: its own colour, as bright as its intensity is next to the peak. */
export function whiteCardColors(bins: DetectorReading['bins']): string[] {
  const peak = peakOf(bins.intensity);
  const colors: string[] = [];
  for (let index = 0; index < bins.intensity.length; index += 1) {
    const brightness = peak > 0 ? bins.intensity[index] / peak : 0;
    const channels = [bins.red[index], bins.green[index], bins.blue[index]];
    const strongest = Math.max(...channels);
    // A lit bin with no colour data shows as white rather than vanishing.
    const [red, green, blue] =
      strongest > 0 ? channels.map((channel) => channel / strongest) : [1, 1, 1];
    const level = (channel: number) => Math.round(channel * brightness * 255);
    colors.push(`rgb(${level(red)}, ${level(green)}, ${level(blue)})`);
  }
  return colors;
}

/** SVG polyline points, one per bin centre, with the peak at the top and zero at the bottom. */
export function brightnessGraphPoints(
  intensity: Float64Array,
  width: number,
  height: number,
): string {
  const peak = peakOf(intensity);
  const points: string[] = [];
  for (let index = 0; index < intensity.length; index += 1) {
    const x = ((index + 0.5) / intensity.length) * width;
    const y = peak > 0 ? height - (intensity[index] / peak) * height : height;
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export interface MillimetreTick {
  mm: number;
  label: string;
  /** Where the mark sits, from 0 at the detector's left end to 1 at its right end. */
  share: number;
}

/** Marks every 1 to 100 mm along a detector, at the smallest step that gives ten or fewer. */
export function millimetreTicks(length: number): MillimetreTick[] {
  const step = tickSteps.find((candidate) => length / candidate + 1 <= mostTicks) ?? 100;
  const ticks: MillimetreTick[] = [];
  for (let mm = 0; mm <= length; mm += step) {
    ticks.push({ mm, label: `${mm} mm`, share: mm / length });
  }
  return ticks;
}
