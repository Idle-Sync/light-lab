export function Inspector() {
  return (
    <aside
      aria-label="Inspector"
      className="absolute top-4 right-4 flex w-[300px] flex-col gap-2 rounded-[14px] border border-rule bg-bench/90 p-4"
    >
      <h2 className="m-0 text-[17px] font-semibold tracking-tight">Bench</h2>
      <p className="m-0 text-graphite">Select anything on the bench to edit it.</p>
    </aside>
  );
}
