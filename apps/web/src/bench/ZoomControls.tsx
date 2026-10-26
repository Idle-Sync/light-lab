import { Button } from '../components/ui/button';
import { store } from '../store';
import { getCanvasStatus } from './canvas-status';
import { ScaleBar } from './ScaleBar';
import { clampScale, fitView } from './view';

// The view offset is the bench point at the canvas centre, so changing only the scale zooms
// around the centre.
function zoomBy(factor: number): void {
  store.setView({ scale: clampScale(store.getState().view.scale * factor) });
}

function fitBench(): void {
  const { width, height } = getCanvasStatus();
  store.setView(fitView(store.getState().scene.objects, { width, height }));
}

export function ZoomControls() {
  return (
    <div className="absolute bottom-4 left-[88px] flex items-center gap-3">
      <fieldset
        aria-label="Zoom"
        className="m-0 flex min-w-0 rounded-xl border border-rule bg-bench/90 p-[3px]"
      >
        <Button variant="ghost" size="icon-lg" aria-label="Zoom out" onClick={() => zoomBy(0.8)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </Button>
        <Button variant="ghost" size="lg" className="px-3" onClick={fitBench}>
          Fit
        </Button>
        <Button variant="ghost" size="icon-lg" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5v14" />
          </svg>
        </Button>
      </fieldset>
      <ScaleBar />
    </div>
  );
}
