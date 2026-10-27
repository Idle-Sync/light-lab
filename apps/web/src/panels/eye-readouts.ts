import { type EyeAnalysis, type EyeRow, pathLabel } from '@light-lab/engine';
import { keptEyeRows } from './eye-rows';
import { percent, type Readout, readout } from './readouts';

export interface EyeRowView {
  key: string;
  label: string;
  transmission: string;
  color: string;
  detail: string;
}

const assumes =
  'Light paths are grouped by the surfaces they cross; powers are shares of one source.';

function eyeRowView(row: EyeRow): EyeRowView {
  const { top } = row;
  const distance = top.distance.toFixed(0);
  const where =
    top.kind === 'real'
      ? `Real image ${distance} mm in front`
      : top.kind === 'virtual'
        ? `Virtual image, appears ${distance} mm away`
        : top.kind === 'behind'
          ? 'Still converging, would focus behind the eye'
          : 'Image at infinity, rays arrive parallel';
  const scale = 255 / Math.max(...row.color, 1e-12);
  const [red, green, blue] = row.color.map((channel) => Math.round(channel * scale));
  return {
    // Two sources can share a path, so the path alone does not identify a row.
    key: `${top.sourceId}|${row.path}`,
    label: pathLabel(row.path),
    transmission: percent(row.transmission),
    color: `rgb(${red}, ${green}, ${blue})`,
    detail: `${where}. ${percent(row.power)} of the source enters the pupil${top.visible ? '.' : ', outside the field of view.'}`,
  };
}

/** The readouts and light-path rows for one eye; `analysis` is null before any has run. */
export function eyeReadouts(
  analysis: EyeAnalysis | null,
  eyeId: number,
): { readouts: Readout[]; rows: EyeRowView[] } {
  const intoPupilExplanation =
    'The share of one source that passes through the pupil and reaches the back of the eye.';
  if (!analysis || analysis.eyeId !== eyeId || analysis.rows.length === 0) {
    return {
      readouts: [readout('Light into the pupil', 'None', assumes, intoPupilExplanation)],
      rows: [],
    };
  }
  const kept = keptEyeRows(analysis);
  return {
    readouts: [
      readout(
        'Light into the pupil',
        `${percent(analysis.totalIntoPupil)} of a source`,
        assumes,
        intoPupilExplanation,
      ),
      readout(
        'Distinct light paths',
        String(kept.length),
        assumes,
        'The number of different routes through the glass that light takes to reach the eye.',
      ),
    ],
    rows: kept.slice(0, 6).map(eyeRowView),
  };
}
