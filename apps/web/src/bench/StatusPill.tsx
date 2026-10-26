import { useAppState } from '../store';
import { useCanvasStatus } from './canvas-status';

/** Ray count and trace time; the data attributes carry raw timings for performance tests. */
export function StatusPill() {
  const results = useAppState((state) => state.results);
  const traceCount = useAppState((state) => state.traceCount);
  const frameMs = useCanvasStatus((status) => status.frameMs);

  let text = 'Tracing…';
  if (results) {
    const segments = results.trace.segmentCount.toLocaleString('en-US');
    text = `${segments} ray segments traced in ${results.traceMs.toFixed(1)} ms`;
  }

  return (
    <div
      role="status"
      data-trace-ms={results?.traceMs}
      data-eye-ms={results?.eyeMs}
      data-trace-count={traceCount}
      data-frame-ms={frameMs}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-rule bg-bench/90 px-4 py-2.5 whitespace-nowrap text-graphite tabular-nums"
    >
      {text}
    </div>
  );
}
