import { ScaleBar } from './ScaleBar';

export function ZoomControls() {
  return (
    <div className="absolute bottom-4 left-[88px] flex items-center gap-3">
      <div className="h-[46px] w-[140px] rounded-xl border border-rule bg-bench/90" />
      <ScaleBar />
    </div>
  );
}
