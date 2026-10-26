import {
  type EyeRow,
  overlappingGlass,
  pathLabel,
  type Scene,
  type SceneObject,
  type Settings,
} from '@light-lab/engine';
import { useMemo, useRef } from 'react';
import type { SceneResults } from '../engine-worker';
import { store, useAppState } from '../store';
import { keptEyeRows } from './eye-rows';
import {
  type ChoiceField,
  type Field,
  kindFields,
  kindTitles,
  pickChip,
  type SliderField,
  sliderInput,
  subtitleOf,
} from './inspector-fields';
import { objectReadouts } from './object-readouts';
import { overlapWarning, percent, type Readout } from './readouts';

const chipClass =
  'rounded-md border px-2.5 py-1 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';
const chipOnClass = 'border-sodium/60 bg-sodium/15 text-[#FFD08A]';
const chipOffClass = 'border-rule bg-transparent text-chalk';

function Chips(props: {
  label: string;
  options: Array<{ value: string | number | boolean; label: string }>;
  isOn: (value: string | number | boolean) => boolean;
  onPick: (value: string | number | boolean) => void;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend className="p-0 text-graphite">{props.label}</legend>
      <div className="flex flex-wrap gap-1">
        {props.options.map((option) => {
          const on = props.isOn(option.value);
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={on}
              className={`${chipClass} ${on ? chipOnClass : chipOffClass}`}
              onClick={() => pickChip(on, option.value, props.onPick)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SliderRow(props: { object: SceneObject; field: SliderField }) {
  const { object, field } = props;
  const inputId = `inspector-${object.id}-${field.key}`;
  const value = (object as Record<string, unknown>)[field.key] as number;
  const pointerHeld = useRef(false);

  function releaseThumb(): void {
    pointerHeld.current = false;
    store.finishEdit();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <label htmlFor={inputId} className="text-graphite">
          {field.label}
        </label>
        <output htmlFor={inputId} className="tabular-nums">
          {Math.round(value * 10) / 10}
          {field.unit}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        className="w-full accent-sodium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sodium"
        onPointerDown={(event) => {
          pointerHeld.current = true;
          // Keeps pointerup on this input when the drag ends outside it.
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={releaseThumb}
        onPointerCancel={releaseThumb}
        onChange={(event) =>
          sliderInput(store, object.id, field.key, Number(event.target.value), {
            pointerHeld: pointerHeld.current,
          })
        }
      />
    </div>
  );
}

function FieldRow(props: { object: SceneObject; field: Field }) {
  const { object, field } = props;
  if (field.type === 'slider') return <SliderRow object={object} field={field} />;
  const current = (object as Record<string, unknown>)[field.key];
  return (
    <Chips
      label={field.label}
      options={field.options}
      isOn={(value) => value === current}
      onPick={(value) =>
        store.updateObject(object.id, { [field.key]: value } as Partial<SceneObject>)
      }
    />
  );
}

function Readouts(props: { readouts: Readout[] }) {
  const assumptions = [...new Set(props.readouts.map((item) => item.assumes))];
  if (props.readouts.length === 0) return null;
  return (
    <>
      <dl className="m-0 flex flex-col gap-1">
        {props.readouts.map((item) => (
          <div key={item.label} className="flex justify-between gap-3">
            <dt className="text-graphite">{item.label}</dt>
            <dd className="m-0 text-right tabular-nums">
              {item.value}
              {item.theory && <span className="block text-graphite">{item.theory}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <details>
        <summary className="cursor-pointer text-graphite focus-visible:outline-2 focus-visible:outline-sodium">
          Assumptions
        </summary>
        <ul className="m-0 mt-1 flex list-disc flex-col gap-1 pl-4 text-graphite">
          {assumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </>
  );
}

function eyeReadouts(
  results: SceneResults | null,
  eyeId: number,
): { readouts: Readout[]; rows: EyeRowView[] } {
  const analysis = results?.eye;
  const assumes =
    'Light paths are grouped by the surfaces they cross; powers are shares of one source.';
  if (!analysis || analysis.eyeId !== eyeId || analysis.rows.length === 0) {
    return { readouts: [{ label: 'Light into the pupil', value: 'None', assumes }], rows: [] };
  }
  const kept = keptEyeRows(analysis);
  return {
    readouts: [
      {
        label: 'Light into the pupil',
        value: `${percent(analysis.totalIntoPupil)} of a source`,
        assumes,
      },
      { label: 'Distinct light paths', value: String(kept.length), assumes },
    ],
    rows: kept.slice(0, 6).map(eyeRowView),
  };
}

interface EyeRowView {
  key: string;
  label: string;
  transmission: string;
  color: string;
  detail: string;
}

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

function ObjectPanel(props: { object: SceneObject; scene: Scene; results: SceneResults | null }) {
  const { object, scene, results } = props;
  const overlaps = useMemo(() => overlappingGlass(scene), [scene]);
  const warning = overlapWarning(
    overlaps,
    object.id,
    (id) => scene.objects.find((other) => other.id === id)?.kind ?? object.kind,
  );
  const eye = object.kind === 'eye' ? eyeReadouts(results, object.id) : null;
  const readouts =
    eye?.readouts ??
    objectReadouts(object, results?.trace.detectors[object.id], scene.settings.brightness);

  return (
    <section aria-label={kindTitles[object.kind]} className="flex flex-col gap-3">
      <div>
        <h2 className="m-0 text-[17px] font-semibold tracking-tight">{kindTitles[object.kind]}</h2>
        <p className="m-0 text-graphite">{subtitleOf(object)}</p>
        <p className="m-0 text-graphite tabular-nums">
          x {object.x} mm, y {object.y} mm
        </p>
      </div>
      {warning && (
        <p role="status" className="m-0 text-sodium">
          {warning}
        </p>
      )}
      {kindFields[object.kind].map((field) => (
        <FieldRow key={field.key} object={object} field={field} />
      ))}
      <Readouts readouts={readouts} />
      {eye && eye.rows.length > 0 && (
        <ul aria-label="Light paths" className="m-0 flex list-none flex-col gap-2 p-0">
          {eye.rows.map((row) => (
            <li key={row.key} className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-1 size-3 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
              <span>
                <span className="block">
                  {row.label}, <span className="tabular-nums">{row.transmission}</span> transmitted
                </span>
                <span className="block text-graphite">{row.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const polarizationOptions: ChoiceField['options'] = [
  { value: 'unpolarized', label: 'Unpolarized' },
  { value: 's', label: 's' },
  { value: 'p', label: 'p' },
];

function SceneSettings(props: { scene: Scene; results: SceneResults | null }) {
  const { settings, objects } = props.scene;
  const set = (patch: Partial<Settings>) => store.setSettings(patch);
  return (
    <section aria-label="Scene settings" className="flex flex-col gap-3 border-t border-rule pt-3">
      <h2 className="m-0 text-[17px] font-semibold tracking-tight">Scene</h2>
      <Chips
        label="Partial reflections"
        options={[
          { value: true, label: 'On' },
          { value: false, label: 'Off' },
        ]}
        isOn={(value) => value === settings.partialReflections}
        onPick={(value) => set({ partialReflections: value as boolean })}
      />
      <Chips
        label="Polarization"
        options={polarizationOptions}
        isOn={(value) => value === settings.polarization}
        onPick={(value) => set({ polarization: value as Settings['polarization'] })}
      />
      <Chips
        label="Brightness"
        options={[
          { value: '2d', label: '2D' },
          { value: '3d', label: '3D equivalent' },
        ]}
        isOn={(value) => value === settings.brightness}
        onPick={(value) => set({ brightness: value as Settings['brightness'] })}
      />
      <dl className="m-0 flex flex-col gap-1">
        <div className="flex justify-between">
          <dt className="text-graphite">Objects</dt>
          <dd className="m-0 tabular-nums">{objects.length}</dd>
        </div>
        {props.results && (
          <>
            <div className="flex justify-between">
              <dt className="text-graphite">Ray segments</dt>
              <dd className="m-0 tabular-nums">
                {props.results.trace.segmentCount.toLocaleString('en-US')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-graphite">Trace time</dt>
              <dd className="m-0 tabular-nums">{props.results.traceMs.toFixed(1)} ms</dd>
            </div>
          </>
        )}
      </dl>
    </section>
  );
}

export function Inspector() {
  const scene = useAppState((state) => state.scene);
  const selectedId = useAppState((state) => state.selectedId);
  const results = useAppState((state) => state.results);
  const object = scene.objects.find((candidate) => candidate.id === selectedId);

  return (
    <aside
      aria-label="Inspector"
      className="absolute top-4 right-4 flex max-h-[calc(100%-2rem)] w-[300px] flex-col gap-3 overflow-y-auto rounded-[14px] border border-rule bg-bench/90 p-4 max-[760px]:top-auto max-[760px]:right-3 max-[760px]:bottom-[136px] max-[760px]:left-3 max-[760px]:max-h-[42%] max-[760px]:w-auto"
    >
      {object ? (
        <ObjectPanel object={object} scene={scene} results={results} />
      ) : (
        <p className="m-0 text-graphite">Select anything on the bench to edit it.</p>
      )}
      <SceneSettings scene={scene} results={results} />
    </aside>
  );
}
