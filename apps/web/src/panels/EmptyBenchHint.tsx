import { useAppState } from '../store';

export function EmptyBenchHint() {
  const isEmpty = useAppState((state) => state.scene.objects.length === 0);
  if (!isEmpty) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-sm rounded-[14px] border border-rule bg-bench/90 p-4 text-center">
        <p className="m-0 text-[15px] font-semibold">The bench is empty</p>
        <p className="m-0 mt-2 text-graphite">
          Start with a light source from the toolbar: Point, Beam or Object. Add a lens, mirror or
          prism to bend the light, then an Eye or a Detector to see what arrives.
        </p>
        <p className="m-0 mt-2 text-graphite">Or open an example from the top bar.</p>
      </div>
    </div>
  );
}
