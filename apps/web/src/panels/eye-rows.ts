import type { EyeAnalysis, EyeRow } from '@light-lab/engine';

// Rows below this share of the strongest group are too faint to list, as in the prototype.
const faintestRowShare = 1e-4;

/** The eye's light paths worth listing: rows at or above 1e-4 of the strongest group's power. */
export function keptEyeRows(analysis: EyeAnalysis): EyeRow[] {
  if (analysis.groups.length === 0) return [];
  // Groups are sorted strongest first.
  const threshold = analysis.groups[0].power * faintestRowShare;
  return analysis.rows.filter((row) => row.power >= threshold);
}
