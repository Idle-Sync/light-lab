import {
  glasses,
  type Material,
  type ObjectKind,
  type SceneObject,
  type Spectrum,
} from '@light-lab/engine';

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

function slider(
  label: string,
  key: string,
  min: number,
  max: number,
  unit = '',
  step = 1,
): SliderField {
  return { type: 'slider', label, key, min, max, step, unit };
}

function angle(label: string): SliderField {
  return slider(label, 'angle', -180, 180, '°');
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
    slider('Rays per wavelength', 'rays', 1, 121, '', 2),
    slider('Cone angle', 'cone', 1, 360, '°'),
    angle('Direction'),
  ],
  beam: [
    spectrum,
    slider('Rays per wavelength', 'rays', 1, 61, '', 2),
    slider('Beam width', 'width', 1, 120, ' mm'),
    angle('Direction'),
  ],
  object: [
    spectrum,
    slider('Height', 'height', 2, 150, ' mm'),
    slider('Rays drawn per point', 'rays', 1, 61, '', 2),
    slider('Cone angle', 'cone', 1, 180, '°'),
    angle('Direction'),
  ],
  mirror: [slider('Length', 'length', 5, 300, ' mm'), angle('Angle')],
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
    slider('Radius of curvature', 'radius', 20, 600, ' mm'),
    slider('Diameter', 'diameter', 4, 200, ' mm'),
    angle('Facing'),
  ],
  lens: [
    glass,
    slider('Front radius R1', 'radius1', 10, 400, ' mm'),
    slider('Back radius R2', 'radius2', 10, 400, ' mm'),
    slider('Diameter', 'diameter', 4, 120, ' mm'),
    angle('Axis angle'),
  ],
  prism: [glass, slider('Side length', 'side', 10, 200, ' mm'), angle('Rotation')],
  ball: [glass, slider('Diameter', 'diameter', 2, 150, ' mm')],
  blocker: [slider('Length', 'length', 2, 300, ' mm'), angle('Angle')],
  detector: [slider('Length', 'length', 2, 300, ' mm'), angle('Angle')],
  ruler: [slider('Length', 'length', 1, 500, ' mm', 0.5), angle('Angle')],
  eye: [
    slider('Pupil diameter', 'pupil', 1, 40, ' mm'),
    slider('Field of view', 'fieldOfView', 10, 170, '°'),
    angle('Looking toward'),
  ],
};

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
