import type { ObjectKind } from '@light-lab/engine';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { type GuideItem, rayModelSections, toolGuide } from './guide-entries';

function ItemList(props: { title: string; items: GuideItem[] }) {
  if (props.items.length === 0) return null;
  return (
    <>
      <p className="m-0 mt-2 font-semibold">{props.title}</p>
      <dl className="m-0 flex flex-col gap-1">
        {props.items.map((item) => (
          <div key={item.label}>
            <dt className="inline font-medium">{item.label}: </dt>
            <dd className="m-0 inline text-graphite">{item.explanation}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function ToolSection(props: { kind: ObjectKind }) {
  const entry = toolGuide[props.kind];
  return (
    <section className="flex flex-col gap-1 border-t border-rule pt-3">
      <h4 className="m-0 text-[15px] font-semibold">{entry.title}</h4>
      <p className="m-0">{entry.what}</p>
      <ItemList title="Controls" items={entry.controls} />
      <ItemList title="Readouts" items={entry.readouts} />
      <p className="m-0 mt-2 font-semibold">Assumes</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {entry.assumptions.map((assumption) => (
          <li key={assumption.assumes}>
            <span className="block italic">{assumption.assumes}</span>
            <span className="block text-graphite">{assumption.meaning}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The Guide button and the dialog it opens: every tool, and how the light is modelled. */
export function Guide() {
  const openButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const kinds = Object.keys(toolGuide) as ObjectKind[];

  return (
    <>
      <Button
        ref={openButton}
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => dialog.current?.showModal()}
      >
        Guide
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="guide-title"
        // Set explicitly rather than trusting each browser's dialog focus restore: a keyboard user
        // expects to land back on the button that opened the guide.
        onClose={() => openButton.current?.focus()}
        // The editing shortcuts listen on window; without this, Backspace or Cmd+Z pressed in the
        // guide would edit the bench hidden behind it. Escape still closes the dialog natively.
        onKeyDown={(event) => event.stopPropagation()}
        className="m-auto max-h-[85vh] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-rule bg-bench p-0 text-chalk backdrop:bg-black/70"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-rule bg-bench px-4 py-3">
          <h2 id="guide-title" className="m-0 text-[17px] font-semibold tracking-tight">
            Guide
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => dialog.current?.close()}>
            Close
          </Button>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3 text-[13px] leading-relaxed">
          <h3 className="m-0 text-[15px] font-semibold tracking-tight">Tools</h3>
          {kinds.map((kind) => (
            <ToolSection key={kind} kind={kind} />
          ))}
          <h3 className="m-0 mt-3 text-[15px] font-semibold tracking-tight">
            How the light is modelled
          </h3>
          {rayModelSections.map((section) => (
            <section
              key={section.heading}
              className="flex flex-col gap-1 border-t border-rule pt-3"
            >
              <h4 className="m-0 text-[15px] font-semibold">{section.heading}</h4>
              <p className="m-0">{section.model}</p>
              <p className="m-0 text-graphite">Assumes: {section.assumes}</p>
            </section>
          ))}
        </div>
      </dialog>
    </>
  );
}
