import {
  fieldRanges,
  glasses,
  type LensObject,
  type Material,
  type NumberRange,
  type ObjectKind,
  refractiveIndex,
  type SceneObject,
  type Spectrum,
  symmetricLensRadius,
  thickLensFocalLength,
} from '@light-lab/engine';
import type { Store } from '../store';

export interface SliderField {
  type: 'slider';
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export interface ChoiceField {
  type: 'choice';
  label: string;
  key: string;
  options: Array<{ value: string | number; label: string }>;
}

export type Field = SliderField | ChoiceField;

function slider(label: string, key: string, range: NumberRange, unit = '', step = 1): SliderField {
  return { type: 'slider', label, key, min: range.min, max: range.max, step, unit };
}

function angle(label: string): SliderField {
  return slider(label, 'angle', fieldRanges.angle, '°');
}

const glass: ChoiceField = {
  type: 'choice',
  label: 'Glass',
  key: 'material',
  options: [
    { value: 'bk7', label: glasses.bk7.label },
    { value: 'sf11', label: glasses.sf11.label },
    { value: 'silica', label: glasses.silica.label },
  ],
};

const spectrum: ChoiceField = {
  type: 'choice',
  label: 'Spectrum',
  key: 'spectrum',
  options: [
    { value: 'white', label: 'White' },
    { value: 405, label: '405 nm' },
    { value: 532, label: '532 nm' },
    { value: 589.3, label: '589 nm' },
    { value: 632.8, label: '633 nm' },
  ],
};

export const kindTitles: Record<ObjectKind, string> = {
  point: 'Point source',
  beam: 'Collimated beam',
  object: 'Object',
  mirror: 'Flat mirror',
  arcMirror: 'Curved mirror',
  lens: 'Thick lens',
  prism: 'Prism',
  ball: 'Ball lens',
  blocker: 'Blocker',
  detector: 'Detector',
  ruler: 'Ruler',
  eye: 'Eye',
};

export const kindFields: Record<ObjectKind, Field[]> = {
  point: [
    spectrum,
    slider('Rays per wavelength', 'rays', fieldRanges.point.rays, '', 2),
    slider('Cone angle', 'cone', fieldRanges.point.cone, '°'),
    angle('Direction'),
  ],
  beam: [
    spectrum,
    slider('Rays per wavelength', 'rays', fieldRanges.beam.rays, '', 2),
    slider('Beam width', 'width', fieldRanges.beam.width, ' mm'),
    angle('Direction'),
  ],
  object: [
    spectrum,
    slider('Height', 'height', fieldRanges.object.height, ' mm'),
    slider('Rays drawn per point', 'rays', fieldRanges.object.rays, '', 2),
    slider('Cone angle', 'cone', fieldRanges.object.cone, '°'),
    angle('Direction'),
  ],
  mirror: [slider('Length', 'length', fieldRanges.mirror.length, ' mm'), angle('Angle')],
  arcMirror: [
    {
      type: 'choice',
      label: 'Shape',
      key: 'form',
      options: [
        { value: 'concave', label: 'Concave' },
        { value: 'convex', label: 'Convex' },
      ],
    },
    slider('Radius of curvature', 'radius', fieldRanges.arcMirror.radius, ' mm'),
    slider('Diameter', 'diameter', fieldRanges.arcMirror.diameter, ' mm'),
    angle('Facing'),
  ],
  lens: [
    glass,
    slider('Diameter', 'diameter', fieldRanges.lens.diameter, ' mm'),
    angle('Axis angle'),
  ],
  prism: [glass, slider('Side length', 'side', fieldRanges.prism.side, ' mm'), angle('Rotation')],
  ball: [glass, slider('Diameter', 'diameter', fieldRanges.ball.diameter, ' mm')],
  blocker: [slider('Length', 'length', fieldRanges.blocker.length, ' mm'), angle('Angle')],
  detector: [slider('Length', 'length', fieldRanges.detector.length, ' mm'), angle('Angle')],
  ruler: [slider('Length', 'length', fieldRanges.ruler.length, ' mm', 0.5), angle('Angle')],
  eye: [
    // A human pupil opens from about 2 mm in bright light to 8 mm in the dark.
    slider('Pupil diameter', 'pupil', fieldRanges.eye.pupil, ' mm'),
    slider('Field of view', 'fieldOfView', fieldRanges.eye.fieldOfView, '°'),
    angle('Looking toward'),
  ],
};

/** The lens radii, shown under Advanced: the focal length slider sets both at once. */
export const lensRadiusFields: SliderField[] = [
  slider('Front radius R1', 'radius1', fieldRanges.lens.radius1, ' mm'),
  slider('Back radius R2', 'radius2', fieldRanges.lens.radius2, ' mm'),
];

// The focal length the lens labels and readouts quote is the one at the helium d-line.
const dLine = 587.56;

export function lensFocalLength(lens: LensObject): number {
  return thickLensFocalLength(lens, refractiveIndex(lens.material, dLine));
}

/** The focal lengths the radius range allows for this lens's glass and diameter, in mm. */
export function lensFocalRange(lens: LensObject): { min: number; max: number } {
  const n = refractiveIndex(lens.material, dLine);
  const focalAt = (radius: number) =>
    thickLensFocalLength(
      { radius1: radius, radius2: radius, diameter: Math.min(lens.diameter, 1.96 * radius) },
      n,
    );
  return {
    min: Math.ceil(focalAt(fieldRanges.lens.radius1.min)),
    max: Math.floor(focalAt(fieldRanges.lens.radius1.max)),
  };
}

/**
 * Applies a focal length slider value: both radii become the one that gives that focal length,
 * rounded to 0.01 mm. History merges like `sliderInput`.
 */
export function focalLengthInput(
  store: Store,
  id: number,
  focal: number,
  options: { pointerHeld: boolean },
): void {
  const lens = store.getState().scene.objects.find((candidate) => candidate.id === id);
  if (lens?.kind !== 'lens') return;
  const n = refractiveIndex(lens.material, dLine);
  const radius = Math.round(symmetricLensRadius(focal, n, lens.diameter) * 100) / 100;
  const patch = physicalPatch(lens, { radius1: radius, radius2: radius });
  store.updateObject(id, patch, { continuesEdit: options.pointerHeld });
}

export function subtitleOf(object: SceneObject): string {
  if ('material' in object) return glasses[object.material as Material].label;
  if ('spectrum' in object) {
    const spectrum: Spectrum = object.spectrum;
    return spectrum === 'white' ? 'White light' : `${spectrum} nm`;
  }
  return '';
}

/** Keeps a lens or curved mirror physical: its diameter cannot exceed what its radii allow. */
export function physicalPatch(
  object: SceneObject,
  patch: Partial<SceneObject>,
): Partial<SceneObject> {
  if (object.kind === 'lens') {
    const merged = { ...object, ...patch } as typeof object;
    const limit = 1.96 * Math.min(merged.radius1, merged.radius2);
    return { ...patch, diameter: Math.min(merged.diameter, limit) } as Partial<SceneObject>;
  }
  if (object.kind === 'arcMirror') {
    const merged = { ...object, ...patch } as typeof object;
    const limit = 1.96 * merged.radius;
    return { ...patch, diameter: Math.min(merged.diameter, limit) } as Partial<SceneObject>;
  }
  return patch;
}

/**
 * Applies a slider value to an object. While a pointer holds the thumb the changes merge into
 * one history entry, closed by `store.finishEdit()` on pointerup; a keyboard step is its own entry.
 */
export function sliderInput(
  store: Store,
  id: number,
  key: string,
  value: number,
  options: { pointerHeld: boolean },
): void {
  const object = store.getState().scene.objects.find((candidate) => candidate.id === id);
  if (!object) return;
  const patch = physicalPatch(object, { [key]: value } as Partial<SceneObject>);
  store.updateObject(id, patch, { continuesEdit: options.pointerHeld });
}

/** A chip click: picking the option already on is no edit, so it adds no history entry. */
export function pickChip<T>(on: boolean, value: T, onPick: (value: T) => void): void {
  if (on) return;
  onPick(value);
}
