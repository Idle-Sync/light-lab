import type { ObjectKind } from '@light-lab/engine';
import { Button } from '@/components/ui/button';
import { store } from '../store';

// The visible text is short for the narrow bar; the accessible name says the whole action.
const tools: Array<{ kind: ObjectKind; text: string; name: string }> = [
  { kind: 'point', text: 'Point', name: 'Add point source' },
  { kind: 'beam', text: 'Beam', name: 'Add collimated beam' },
  { kind: 'object', text: 'Object', name: 'Add object' },
  { kind: 'mirror', text: 'Mirror', name: 'Add flat mirror' },
  { kind: 'arcMirror', text: 'Curved', name: 'Add curved mirror' },
  { kind: 'lens', text: 'Lens', name: 'Add lens' },
  { kind: 'prism', text: 'Prism', name: 'Add prism' },
  { kind: 'ball', text: 'Ball', name: 'Add ball lens' },
  { kind: 'blocker', text: 'Blocker', name: 'Add blocker' },
  { kind: 'detector', text: 'Detector', name: 'Add detector' },
  { kind: 'ruler', text: 'Ruler', name: 'Add ruler' },
  { kind: 'eye', text: 'Eye', name: 'Add eye' },
];

export function Toolbar() {
  return (
    <div
      role="toolbar"
      aria-label="Add to bench"
      className="absolute top-4 left-4 flex max-h-[calc(100%-2rem)] w-20 flex-col gap-1 overflow-y-auto rounded-[14px] border border-rule bg-bench/90 p-1.5 max-[760px]:top-auto max-[760px]:right-3 max-[760px]:bottom-[68px] max-[760px]:left-3 max-[760px]:w-auto max-[760px]:flex-row max-[760px]:overflow-x-auto"
    >
      {tools.map((tool) => (
        <Button
          key={tool.kind}
          type="button"
          variant="ghost"
          size="sm"
          aria-label={tool.name}
          onClick={() => store.addObject(tool.kind)}
        >
          {tool.text}
        </Button>
      ))}
    </div>
  );
}
