import type { DetectorReading } from '@light-lab/engine';
import { lengthText } from './readouts';

// A bin counts as lit when it holds at least this share of the brightest bin.
const litShare = 0.1;
// A spot this many bins wide or narrower reads as sharp.
const sharpSpotBins = 2;
// Red's share of red plus blue must change at least this much from one end to the other.
const spectrumMinimumHueChange = 0.5;
// A step against the trend smaller than this is noise, not a break in the spectrum.
const spectrumHueNoise = 0.05;
// A spectrum needs at least this many lit bins to show a trend.
const spectrumMinimumBins = 3;

function litBins(intensity: Float64Array): number[] {
  const peak = Math.max(...intensity);
  const lit: number[] = [];
  for (let index = 0; index < intensity.length; index += 1) {
    if (intensity[index] >= peak * litShare) lit.push(index);
  }
  return lit;
}

/** Red's share of red plus blue in each lit bin; a bin with neither colour is skipped. */
function redShares(bins: DetectorReading['bins'], lit: number[]): number[] {
  const shares: number[] = [];
  for (const index of lit) {
    const total = bins.red[index] + bins.blue[index];
    if (total > 0) shares.push(bins.red[index] / total);
  }
  return shares;
}

function isSpectrum(shares: number[]): boolean {
  if (shares.length < spectrumMinimumBins) return false;
  const change = shares[shares.length - 1] - shares[0];
  if (Math.abs(change) < spectrumMinimumHueChange) return false;
  const direction = Math.sign(change);
  for (let index = 1; index < shares.length; index += 1) {
    const step = shares[index] - shares[index - 1];
    if (step * direction < -spectrumHueNoise) return false;
  }
  return true;
}

/** One sentence on what the light on a detector looks like, for a beginner. */
export function detectorVerdict(
  reading: DetectorReading | undefined,
  detectorLength: number,
): string {
  if (!reading || reading.power <= 0) return 'No light reaches the detector.';
  const { bins } = reading;
  const lit = litBins(bins.intensity);
  const span = lit[lit.length - 1] - lit[0] + 1;
  const width = lengthText((span * detectorLength) / bins.intensity.length);
  if (span <= sharpSpotBins) return `Sharp spot, ${width} wide.`;
  if (isSpectrum(redShares(bins, lit))) return `Colours separated into a spectrum over ${width}.`;
  return `Light spread over ${width}.`;
}
