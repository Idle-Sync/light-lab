import * as v from 'valibot';

// Lengths are mm, angles degrees, wavelengths nm.

export interface NumberRange {
  min: number;
  max: number;
}

/** The limits of every scene field; the inspector sliders read the same numbers. */
export const fieldRanges = {
  position: { min: -10000, max: 10000 },
  angle: { min: -180, max: 180 },
  wavelength: { min: 380, max: 780 },
  point: { rays: { min: 1, max: 201 }, cone: { min: 1, max: 360 } },
  beam: { rays: { min: 1, max: 61 }, width: { min: 1, max: 120 } },
  object: { height: { min: 2, max: 150 }, rays: { min: 1, max: 61 }, cone: { min: 1, max: 180 } },
  mirror: { length: { min: 5, max: 300 } },
  arcMirror: { radius: { min: 20, max: 600 }, diameter: { min: 4, max: 200 } },
  lens: {
    radius1: { min: 10, max: 400 },
    radius2: { min: 10, max: 400 },
    diameter: { min: 4, max: 120 },
  },
  prism: { side: { min: 10, max: 200 } },
  ball: { diameter: { min: 2, max: 150 } },
  blocker: { length: { min: 2, max: 300 } },
  detector: { length: { min: 2, max: 300 } },
  ruler: { length: { min: 1, max: 500 } },
  eye: { pupil: { min: 1, max: 10 }, fieldOfView: { min: 10, max: 170 } },
};

export const maxObjects = 500;

/** The same orientation inside -180..180; 180 stays 180. */
export function wrapAngle(degrees: number): number {
  if (degrees > -180 && degrees <= 180) return degrees;
  const turned = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return turned === -180 ? 180 : turned;
}

function bounded(range: NumberRange) {
  return v.pipe(v.number(), v.minValue(range.min), v.maxValue(range.max));
}

const spectrumSchema = v.union([v.literal('white'), bounded(fieldRanges.wavelength)]);
const materialSchema = v.picklist(['bk7', 'sf11', 'silica']);

const placement = {
  id: v.pipe(v.number(), v.integer(), v.minValue(0)),
  x: bounded(fieldRanges.position),
  y: bounded(fieldRanges.position),
  angle: bounded(fieldRanges.angle),
};

// Strict objects so a field from another kind is reported instead of silently dropped.
const pointSchema = v.strictObject({
  kind: v.literal('point'),
  ...placement,
  cone: bounded(fieldRanges.point.cone),
  rays: bounded(fieldRanges.point.rays),
  spectrum: spectrumSchema,
});

const beamSchema = v.strictObject({
  kind: v.literal('beam'),
  ...placement,
  width: bounded(fieldRanges.beam.width),
  rays: bounded(fieldRanges.beam.rays),
  spectrum: spectrumSchema,
});

const extendedObjectSchema = v.strictObject({
  kind: v.literal('object'),
  ...placement,
  height: bounded(fieldRanges.object.height),
  cone: bounded(fieldRanges.object.cone),
  rays: bounded(fieldRanges.object.rays),
  spectrum: spectrumSchema,
});

const mirrorSchema = v.strictObject({
  kind: v.literal('mirror'),
  ...placement,
  length: bounded(fieldRanges.mirror.length),
});

const arcMirrorSchema = v.pipe(
  v.strictObject({
    kind: v.literal('arcMirror'),
    ...placement,
    radius: bounded(fieldRanges.arcMirror.radius),
    diameter: bounded(fieldRanges.arcMirror.diameter),
    form: v.picklist(['concave', 'convex']),
  }),
  v.forward(
    v.check(
      (mirror) => mirror.diameter <= 1.96 * mirror.radius,
      'Diameter is wider than the radius allows',
    ),
    ['diameter'],
  ),
);

// A diameter past this makes the lens surface asin of more than 1; the glass would vanish.
const lensSchema = v.pipe(
  v.strictObject({
    kind: v.literal('lens'),
    ...placement,
    radius1: bounded(fieldRanges.lens.radius1),
    radius2: bounded(fieldRanges.lens.radius2),
    diameter: bounded(fieldRanges.lens.diameter),
    material: materialSchema,
  }),
  v.forward(
    v.check(
      (lens) => lens.diameter <= 1.96 * Math.min(lens.radius1, lens.radius2),
      'Diameter is wider than the radii allow',
    ),
    ['diameter'],
  ),
);

const prismSchema = v.strictObject({
  kind: v.literal('prism'),
  ...placement,
  side: bounded(fieldRanges.prism.side),
  material: materialSchema,
});

const ballSchema = v.strictObject({
  kind: v.literal('ball'),
  ...placement,
  diameter: bounded(fieldRanges.ball.diameter),
  material: materialSchema,
});

const blockerSchema = v.strictObject({
  kind: v.literal('blocker'),
  ...placement,
  length: bounded(fieldRanges.blocker.length),
});

const detectorSchema = v.strictObject({
  kind: v.literal('detector'),
  ...placement,
  length: bounded(fieldRanges.detector.length),
});

const rulerSchema = v.strictObject({
  kind: v.literal('ruler'),
  ...placement,
  length: bounded(fieldRanges.ruler.length),
});

const eyeSchema = v.strictObject({
  kind: v.literal('eye'),
  ...placement,
  pupil: bounded(fieldRanges.eye.pupil),
  fieldOfView: bounded(fieldRanges.eye.fieldOfView),
});

export const sceneObjectSchema = v.variant('kind', [
  pointSchema,
  beamSchema,
  extendedObjectSchema,
  mirrorSchema,
  arcMirrorSchema,
  lensSchema,
  prismSchema,
  ballSchema,
  blockerSchema,
  detectorSchema,
  rulerSchema,
  eyeSchema,
]);

export const gridSizeRange = { min: 0.01, max: 500 };

const gridSchema = v.strictObject({
  show: v.optional(v.boolean(), true),
  size: v.optional(
    v.pipe(v.number(), v.minValue(gridSizeRange.min), v.maxValue(gridSizeRange.max)),
    10,
  ),
  snap: v.optional(v.boolean(), false),
});

const settingsSchema = v.strictObject({
  partialReflections: v.optional(v.boolean(), true),
  polarization: v.optional(v.picklist(['unpolarized', 's', 'p']), 'unpolarized'),
  brightness: v.optional(v.picklist(['2d', '3d']), '2d'),
  grid: v.optional(gridSchema, {}),
  sightLines: v.optional(v.boolean(), true),
  showImages: v.optional(v.boolean(), true),
});

export const sceneSchema = v.strictObject({
  v: v.literal(3),
  settings: v.optional(settingsSchema, {}),
  objects: v.pipe(v.array(sceneObjectSchema), v.maxLength(maxObjects)),
});

export type Scene = v.InferOutput<typeof sceneSchema>;
export type Settings = Scene['settings'];
export type GridSettings = Settings['grid'];

/** The settings a scene gets when its JSON leaves them out. */
export const defaultSettings: Settings = v.parse(settingsSchema, {});
export type SceneObject = v.InferOutput<typeof sceneObjectSchema>;
export type ObjectKind = SceneObject['kind'];
export type Material = v.InferOutput<typeof materialSchema>;
export type Spectrum = v.InferOutput<typeof spectrumSchema>;
export type LensObject = v.InferOutput<typeof lensSchema>;

export class SceneError extends Error {
  override name = 'SceneError';
}

/** Validates untrusted scene JSON and fills default settings; throws a one-line `SceneError`. */
export function parseScene(json: unknown): Scene {
  const result = v.safeParse(sceneSchema, json);
  if (!result.success) throw sceneErrorFrom(result.issues[0]);
  return result.output;
}

/** Validates one object the way `parseScene` validates each object of a scene. */
export function parseSceneObject(json: unknown): SceneObject {
  const result = v.safeParse(sceneObjectSchema, json);
  if (!result.success) throw sceneErrorFrom(result.issues[0]);
  return result.output;
}

function sceneErrorFrom(issue: v.BaseIssue<unknown>): SceneError {
  const path = v.getDotPath(issue);
  return new SceneError(path ? `${path}: ${issue.message}` : issue.message);
}
