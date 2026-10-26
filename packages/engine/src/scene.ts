import * as v from 'valibot';

// Lengths are mm, angles degrees, wavelengths nm.

const spectrumSchema = v.union([v.literal('white'), v.number()]);
const materialSchema = v.picklist(['bk7', 'sf11', 'silica']);

const placement = {
  id: v.number(),
  x: v.number(),
  y: v.number(),
  angle: v.number(),
};

// Strict objects so a field from another kind is reported instead of silently dropped.
const pointSchema = v.strictObject({
  kind: v.literal('point'),
  ...placement,
  cone: v.number(),
  rays: v.number(),
  spectrum: spectrumSchema,
});

const beamSchema = v.strictObject({
  kind: v.literal('beam'),
  ...placement,
  width: v.number(),
  rays: v.number(),
  spectrum: spectrumSchema,
});

const extendedObjectSchema = v.strictObject({
  kind: v.literal('object'),
  ...placement,
  height: v.number(),
  cone: v.number(),
  rays: v.number(),
  spectrum: spectrumSchema,
});

const mirrorSchema = v.strictObject({
  kind: v.literal('mirror'),
  ...placement,
  length: v.number(),
});

const arcMirrorSchema = v.strictObject({
  kind: v.literal('arcMirror'),
  ...placement,
  radius: v.number(),
  diameter: v.number(),
  form: v.picklist(['concave', 'convex']),
});

const lensSchema = v.strictObject({
  kind: v.literal('lens'),
  ...placement,
  radius1: v.number(),
  radius2: v.number(),
  diameter: v.number(),
  material: materialSchema,
});

const prismSchema = v.strictObject({
  kind: v.literal('prism'),
  ...placement,
  side: v.number(),
  material: materialSchema,
});

const ballSchema = v.strictObject({
  kind: v.literal('ball'),
  ...placement,
  diameter: v.number(),
  material: materialSchema,
});

const blockerSchema = v.strictObject({
  kind: v.literal('blocker'),
  ...placement,
  length: v.number(),
});

const detectorSchema = v.strictObject({
  kind: v.literal('detector'),
  ...placement,
  length: v.number(),
});

const rulerSchema = v.strictObject({
  kind: v.literal('ruler'),
  ...placement,
  length: v.number(),
});

const eyeSchema = v.strictObject({
  kind: v.literal('eye'),
  ...placement,
  pupil: v.number(),
  fieldOfView: v.number(),
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

const settingsSchema = v.strictObject({
  partialReflections: v.optional(v.boolean(), true),
  polarization: v.optional(v.picklist(['unpolarized', 's', 'p']), 'unpolarized'),
  brightness: v.optional(v.picklist(['2d', '3d']), '2d'),
});

export const sceneSchema = v.strictObject({
  v: v.literal(1),
  settings: v.optional(settingsSchema, {}),
  objects: v.array(sceneObjectSchema),
});

export type Scene = v.InferOutput<typeof sceneSchema>;
export type Settings = Scene['settings'];
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
