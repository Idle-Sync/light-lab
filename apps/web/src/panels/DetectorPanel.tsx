import type { DetectorReading } from '@light-lab/engine';
import { brightnessGraphPoints, millimetreTicks, whiteCardColors } from './detector-graph';
import { detectorVerdict } from './detector-verdict';
import { lengthText } from './readouts';

const graphWidth = 270;
const graphHeight = 60;
const tickLabelY = graphHeight + 14;

function peakPosition(reading: DetectorReading, length: number): number {
  const { intensity } = reading.bins;
  const peakBin = intensity.indexOf(Math.max(...intensity));
  return ((peakBin + 0.5) / intensity.length) * length;
}

function WhiteCard(props: { reading: DetectorReading }) {
  const colors = whiteCardColors(props.reading.bins);
  return (
    <div
      role="img"
      aria-label="White card"
      className="flex h-8 overflow-hidden rounded-md border border-rule"
    >
      {colors.map((color, index) => (
        // The bins never reorder, so the position is the identity.
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length list of bins
        <span key={index} className="h-full flex-1" style={{ background: color }} />
      ))}
    </div>
  );
}

function BrightnessGraph(props: { reading: DetectorReading; length: number }) {
  const { reading, length } = props;
  const peak = lengthText(peakPosition(reading, length));
  const width = lengthText(reading.rmsWidth);
  return (
    <svg
      role="img"
      aria-label={`Brightness along the detector: peak ${peak} from the left end, ${width} RMS width`}
      viewBox={`0 0 ${graphWidth} ${graphHeight + 20}`}
      className="w-full"
    >
      <polyline
        points={brightnessGraphPoints(reading.bins.intensity, graphWidth, graphHeight)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-sodium"
      />
      <line
        x1={0}
        x2={graphWidth}
        y1={graphHeight}
        y2={graphHeight}
        stroke="currentColor"
        className="text-graphite"
      />
      {millimetreTicks(length).map((tick, index, ticks) => {
        const x = tick.share * graphWidth;
        const anchor = index === 0 ? 'start' : index === ticks.length - 1 ? 'end' : 'middle';
        return (
          <g key={tick.mm}>
            <line
              x1={x}
              x2={x}
              y1={graphHeight}
              y2={graphHeight + 4}
              stroke="currentColor"
              className="text-graphite"
            />
            <text
              x={x}
              y={tickLabelY + 4}
              textAnchor={anchor}
              fontSize={10}
              className="fill-graphite"
            >
              {tick.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** What the light on a detector looks like: a verdict, then the white card and brightness graph. */
export function DetectorPanel(props: { length: number; reading: DetectorReading | undefined }) {
  const { length, reading } = props;
  const lit = reading !== undefined && reading.power > 0;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[15px]">{detectorVerdict(reading, length)}</p>
      {lit && <WhiteCard reading={reading} />}
      {lit && <BrightnessGraph reading={reading} length={length} />}
    </div>
  );
}
