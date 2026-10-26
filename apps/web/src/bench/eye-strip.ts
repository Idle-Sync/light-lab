/** Spot radius in pixels. Fixed, so a point source keeps its size at any distance. */
export const spotRadius = 8;

/**
 * Faintest group drawn on the strip, as a share of one source. The exposure is fixed, so
 * this is an absolute floor: the bottom of the four-decade log scale `spotAlpha` maps.
 */
export const faintestShownPower = 1e-4;

/** Horizontal position on the strip of a group seen `angle` degrees off the eye's axis. */
export function stripX(angle: number, fieldOfView: number, width: number): number {
  return ((angle + fieldOfView / 2) / fieldOfView) * width;
}

/** Spot opacity at a fixed exposure: log of the share of a source that enters the pupil. */
export function spotAlpha(power: number): number {
  const alpha = (Math.log10(power) + 4) / 3;
  return Math.min(1, Math.max(0.1, alpha));
}
