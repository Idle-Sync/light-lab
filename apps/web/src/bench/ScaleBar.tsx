import { useAppState } from '../store';
import { niceLength } from './view';

/** A round length about 90 px long at the current zoom. */
export function ScaleBar() {
  const scale = useAppState((state) => state.view.scale);
  const lengthMm = niceLength(90 / scale);

  return (
    <div className="flex flex-col gap-1 text-xs text-graphite tabular-nums">
      <span>{Number(lengthMm.toPrecision(3))} mm</span>
      <div
        className="h-1.5 border-[1.5px] border-t-0 border-graphite"
        style={{ width: `${lengthMm * scale}px` }}
      />
    </div>
  );
}
