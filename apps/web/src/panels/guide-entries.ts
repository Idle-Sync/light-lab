import type {
  DetectorReading,
  EyeAnalysis,
  EyeGroup,
  ObjectKind,
  SceneObject,
} from '@light-lab/engine';
import { eyeReadouts } from './eye-readouts';
import { kindTitles } from './inspector-fields';
import { objectReadouts } from './object-readouts';
import { detectorReadout, type Readout } from './readouts';
import { toolDescriptions } from './tool-descriptions';

/** A control or readout name with one sentence on what it means. */
export interface GuideItem {
  label: string;
  explanation: string;
}

/** An assumes line exactly as the inspector shows it, with what it means in plain words. */
export interface Assumption {
  assumes: string;
  meaning: string;
}

export interface ToolGuideEntry {
  title: string;
  what: string;
  controls: GuideItem[];
  readouts: GuideItem[];
  assumptions: Assumption[];
}

export interface RayModelSection {
  heading: string;
  model: string;
  assumes: string;
}

/** One object of each kind, as the toolbar adds it, for reading the inspector's readouts. */
export const sampleObjects = {
  point: { kind: 'point', id: 1, x: 0, y: 0, angle: 0, cone: 30, rays: 31, spectrum: 'white' },
  beam: { kind: 'beam', id: 2, x: 0, y: 0, angle: 0, width: 20, rays: 9, spectrum: 532 },
  object: {
    kind: 'object',
    id: 3,
    x: 0,
    y: 0,
    angle: 0,
    height: 20,
    cone: 40,
    rays: 9,
    spectrum: 589.3,
  },
  mirror: { kind: 'mirror', id: 4, x: 0, y: 0, angle: 45, length: 60 },
  arcMirror: {
    kind: 'arcMirror',
    id: 5,
    x: 0,
    y: 0,
    angle: 180,
    radius: 120,
    diameter: 60,
    form: 'concave',
  },
  lens: {
    kind: 'lens',
    id: 6,
    x: 0,
    y: 0,
    angle: 0,
    radius1: 60,
    radius2: 60,
    diameter: 40,
    material: 'bk7',
  },
  prism: { kind: 'prism', id: 7, x: 0, y: 0, angle: 0, side: 60, material: 'sf11' },
  ball: { kind: 'ball', id: 8, x: 0, y: 0, angle: 0, diameter: 30, material: 'bk7' },
  blocker: { kind: 'blocker', id: 9, x: 0, y: 0, angle: 90, length: 40 },
  detector: { kind: 'detector', id: 10, x: 0, y: 0, angle: 90, length: 50 },
  ruler: { kind: 'ruler', id: 11, x: 0, y: 0, angle: 0, length: 50 },
  eye: { kind: 'eye', id: 12, x: 0, y: 0, angle: 180, pupil: 8, fieldOfView: 70 },
} satisfies { [Kind in ObjectKind]: Extract<SceneObject, { kind: Kind }> };

// The detector shows more readouts once light reaches it, so the guide reads a lit one too.
export const litDetectorReading: DetectorReading = {
  power: 0.25,
  centroid: 0,
  rmsWidth: 0.1,
  hits: 100,
  bins: {
    intensity: new Float64Array([0.25]),
    red: new Float64Array([0.25]),
    green: new Float64Array([0.25]),
    blue: new Float64Array([0.25]),
  },
};

const sampleEyeGroup: EyeGroup = {
  sourceId: 1,
  pointIndex: 0,
  nm: 589.3,
  path: 't0t0',
  power: 0.4,
  rayCount: 5,
  transmission: 0.9,
  kind: 'real',
  image: [0, 0],
  distance: 100,
  angle: 0,
  visible: true,
  low: null,
  high: null,
};

// The eye shows more readouts once light enters its pupil, so the guide reads one that has.
const litEyeAnalysis: EyeAnalysis = {
  eyeId: sampleObjects.eye.id,
  groups: [sampleEyeGroup],
  rows: [
    {
      path: 't0t0',
      power: 0.4,
      transmission: 0.9,
      rayCount: 5,
      color: [255, 200, 0],
      top: sampleEyeGroup,
    },
  ],
  totalIntoPupil: 0.4,
};

function readoutsShownFor(kind: ObjectKind): Readout[] {
  const object = sampleObjects[kind];
  if (kind === 'eye') {
    return [
      ...eyeReadouts(null, object.id).readouts,
      ...eyeReadouts(litEyeAnalysis, object.id).readouts,
    ];
  }
  const shown: Readout[] = [];
  for (const brightness of ['2d', '3d'] as const) {
    for (const reading of [undefined, litDetectorReading]) {
      shown.push(...objectReadouts(object, reading, brightness));
    }
  }
  return shown;
}

/**
 * The readouts the inspector can show for a kind, each once, read from the inspector's own
 * readout code over both brightness settings, unlit and lit, so the guide never drifts from it.
 */
export function guideReadouts(kind: ObjectKind): GuideItem[] {
  const items: GuideItem[] = [];
  const seen = new Set<string>();
  for (const item of readoutsShownFor(kind)) {
    if (seen.has(item.label)) continue;
    seen.add(item.label);
    items.push({ label: item.label, explanation: item.explanation });
  }
  return items;
}

function toolEntry(
  kind: ObjectKind,
  controls: GuideItem[],
  assumptions: Assumption[],
): ToolGuideEntry {
  const description = toolDescriptions[kind];
  return {
    title: kindTitles[kind],
    what: `${description.what} ${description.use}`,
    controls,
    readouts: guideReadouts(kind),
    assumptions,
  };
}

const spectrum: GuideItem = {
  label: 'Spectrum',
  explanation: 'White light, or a single colour given by its wavelength in nanometres.',
};

const glass: GuideItem = {
  label: 'Glass',
  explanation:
    'The glass it is made of: N-BK7, SF11 or fused silica; each bends light, and each colour, by a different amount.',
};

function turn(label: string, what: string): GuideItem {
  return { label, explanation: `${what}, in degrees.` };
}

function size(label: string, what: string): GuideItem {
  return { label, explanation: `${what}, in millimetres.` };
}

const dispersion: Assumption = {
  assumes: 'Sellmeier dispersion fitted to catalogue glass data, air index 1.',
  meaning:
    "How much each colour bends comes from the glass maker's measurements, and the air around the glass does not bend light at all.",
};
const fresnel: Assumption = {
  assumes: 'Fresnel reflectance for light at normal incidence, no coating.',
  meaning:
    'The reflection figure is for light that meets the surface head on, on bare glass with no anti-reflection coating.',
};
const idealMirror: Assumption = {
  assumes: 'Ideal mirror: reflects all light, no coating loss.',
  meaning: 'A real mirror loses a few percent of the light; this one sends back all of it.',
};
const sampledSource: Assumption = {
  assumes: 'Rays are samples of the source, not a count of photons.',
  meaning:
    'Each ray stands for a share of the light, so more rays give a finer picture but not more light.',
};
const drawnGeometry: Assumption = {
  assumes: 'Plain geometry of the shape as drawn, in millimetres.',
  meaning: 'The number is measured straight from the shape on the bench; no light is involved.',
};
const whiteLight: Assumption = {
  assumes: 'White light is sampled at seven wavelengths.',
  meaning:
    'White light is made of seven colours from violet at 400 nm to red at 670 nm, not of every colour there is.',
};
const thickLens: Assumption = {
  assumes: 'Thick-lens formula for a biconvex lens in air, paraxial.',
  meaning:
    'Worked out with the textbook formula for a lens with two outward-curved faces, which holds for light close to the middle of the lens.',
};
const tracedFocus: Assumption = {
  assumes:
    'Thick-lens formula for a biconvex lens in air; the traced value follows a ray near the axis, so it includes spherical aberration.',
  meaning:
    'The first figure comes from the textbook formula; the traced figure follows a real ray through the glass, so it can differ a little because curved faces do not bring every ray to the same point.',
};
const lensEdge: Assumption = {
  assumes: 'Both sags plus a 1.5 mm edge.',
  meaning: 'The thickness is how deep each curved face is, plus a 1.5 mm rim at the edge.',
};
const minimumDeviation: Assumption = {
  assumes: 'Equilateral prism at minimum deviation.',
  meaning:
    'The prism has three equal sides and the light crosses it evenly, which is where the prism turns the light least.',
};
const ballLens: Assumption = {
  assumes: 'Paraxial ball-lens formula, in air.',
  meaning: 'Worked out with the textbook formula for light close to the line through the centre.',
};
const ballBounce: Assumption = {
  assumes: 'Two surface transmissions and one internal reflection at normal incidence.',
  meaning:
    'Light goes in, bounces once off the inside of the far side and comes back out, all head on.',
};
const halfRadius: Assumption = {
  assumes: 'Half the radius of curvature.',
  meaning:
    'A curved mirror focuses at half the radius of its circle, which holds for light close to its centre line.',
};
const paraxialMirror: Assumption = {
  assumes: 'Paraxial focal length.',
  meaning: 'Uses the focal length above, which holds for light close to the centre line.',
};
const brightness2d: Assumption = {
  assumes: detectorReadout(undefined, '2d').assumes,
  meaning:
    'On a flat bench light spreads out along a line, so it fades more slowly with distance than it would in a room.',
};
const brightness3d: Assumption = {
  assumes: detectorReadout(undefined, '3d').assumes,
  meaning:
    'Each ray is rescaled to estimate what a square sensor would catch in a real room; close for a bare lamp, rough after lenses or mirrors.',
};
const fromCentre: Assumption = {
  assumes: 'Measured along the detector from its centre.',
  meaning: 'Positions are counted from the middle of the detector towards either end.',
};
const absorbsAll: Assumption = {
  assumes: 'Absorbs every ray that meets it.',
  meaning: 'No light passes through the blocker or bounces off it.',
};
const eyePaths: Assumption = {
  assumes: eyeReadouts(null, sampleObjects.eye.id).readouts[0].assumes,
  meaning:
    'Rays that cross the same surfaces in the same order count as one path, and each amount of light is a share of what one source sends out.',
};

const glassAssumptions = [dispersion, fresnel];

/** What each tool does, its controls, its readouts and what those readouts assume. */
export const toolGuide: Record<ObjectKind, ToolGuideEntry> = {
  point: toolEntry(
    'point',
    [
      spectrum,
      {
        label: 'Rays per wavelength',
        explanation:
          'How many rays are drawn for each colour; more rays show the light more finely.',
      },
      {
        label: 'Cone angle',
        explanation: 'How wide the fan of light spreads, in degrees; 360 sends light all round.',
      },
      turn('Direction', 'Which way the middle of the fan points'),
    ],
    [whiteLight, sampledSource],
  ),
  beam: toolEntry(
    'beam',
    [
      spectrum,
      {
        label: 'Rays per wavelength',
        explanation: 'How many rays are drawn across the beam for each colour.',
      },
      size('Beam width', 'How wide the beam is'),
      turn('Direction', 'Which way the beam travels'),
    ],
    [drawnGeometry, sampledSource],
  ),
  object: toolEntry(
    'object',
    [
      spectrum,
      size('Height', 'How tall the arrow is'),
      {
        label: 'Rays drawn per point',
        explanation: 'How many rays are drawn from the foot and from the tip of the arrow.',
      },
      turn('Cone angle', 'How wide the fan of light from each point spreads'),
      turn('Direction', 'Which way the light from the arrow is aimed'),
    ],
    [sampledSource],
  ),
  mirror: toolEntry(
    'mirror',
    [size('Length', 'How long the mirror is'), turn('Angle', 'How far the mirror is turned')],
    [idealMirror],
  ),
  arcMirror: toolEntry(
    'arcMirror',
    [
      {
        label: 'Shape',
        explanation:
          'Concave curves inward and gathers light; convex curves outward and spreads it.',
      },
      {
        label: 'Radius of curvature',
        explanation:
          'The radius of the circle the mirror is cut from, in millimetres; the focal length is half of it.',
      },
      size('Diameter', 'How wide the mirror is from edge to edge'),
      turn('Facing', 'Which way the mirror is turned'),
    ],
    [halfRadius, paraxialMirror, drawnGeometry, idealMirror],
  ),
  lens: toolEntry(
    'lens',
    [
      {
        label: 'Focal length',
        explanation:
          'How far from the lens parallel light comes to a point, at 587.6 nm; it sets both faces to the same curve, and a shorter one bends light more.',
      },
      glass,
      {
        label: 'Diameter',
        explanation: 'How wide the lens is, in millimetres; its curves limit how wide it can be.',
      },
      turn('Axis angle', 'Which way the line through the middle of the lens points'),
      {
        label: 'Advanced: surface radii',
        explanation:
          'Sets the front radius R1 and back radius R2 one at a time, for a lens whose two faces differ.',
      },
    ],
    [tracedFocus, thickLens, lensEdge, ...glassAssumptions],
  ),
  prism: toolEntry(
    'prism',
    [
      glass,
      size('Side length', 'How long each of the three sides is'),
      turn('Rotation', 'How far the prism is turned'),
    ],
    [minimumDeviation, ...glassAssumptions],
  ),
  ball: toolEntry(
    'ball',
    [
      glass,
      {
        label: 'Diameter',
        explanation: 'How big the ball is, in millimetres; a bigger ball focuses farther away.',
      },
    ],
    [ballLens, ballBounce, ...glassAssumptions],
  ),
  blocker: toolEntry(
    'blocker',
    [size('Length', 'How long the bar is'), turn('Angle', 'How far the bar is turned')],
    [absorbsAll],
  ),
  detector: toolEntry(
    'detector',
    [size('Length', 'How long the sensor is'), turn('Angle', 'How far the sensor is turned')],
    [brightness2d, brightness3d, drawnGeometry, fromCentre, sampledSource],
  ),
  ruler: toolEntry(
    'ruler',
    [
      size('Length', 'The distance between its two ends'),
      turn('Angle', 'How far the ruler is turned'),
    ],
    [drawnGeometry],
  ),
  eye: toolEntry(
    'eye',
    [
      {
        label: 'Pupil diameter',
        explanation:
          'How wide the pupil is open, in millimetres; a human pupil opens from about 2 mm in bright light to 8 mm in the dark.',
      },
      turn('Field of view', 'How wide an angle the eye takes in'),
      turn('Looking toward', 'Which way the eye looks'),
    ],
    [eyePaths],
  ),
};

/** How the light is modelled, one part at a time, with what each part assumes. */
export const rayModelSections: RayModelSection[] = [
  {
    heading: 'Light travels in straight lines',
    model:
      'Light is modelled as rays: each ray is a straight line through the air from one surface to the next. Surfaces are exact line segments and circular arcs, so the thickness of a lens and its spherical aberration come out of the trace.',
    assumes:
      'Geometric optics: no diffraction or interference, and air has a refractive index of exactly 1.',
  },
  {
    heading: 'Refraction',
    model:
      "Where a ray meets glass it bends by Snell's law, n1 sin θ1 = n2 sin θ2. When light inside the glass meets the surface too steeply to get out, all of it reflects: total internal reflection.",
    assumes: 'Surfaces are perfectly smooth, and the glass is clear and absorbs no light.',
  },
  {
    heading: 'Partial reflection',
    model:
      'With Partial reflections on, every glass hit that lets light through splits a ray in two, a transmitted and a reflected ray, sharing its light by the Fresnel equations. The Polarization switch picks the reflectance for s or p polarized light, or Unpolarized, the average of the two. With Partial reflections off, all light goes through, except where total internal reflection sends it back.',
    assumes: 'Bare glass with no coating, and mirrors that reflect all of the light.',
  },
  {
    heading: 'Colours and dispersion',
    model:
      'Each glass bends each colour by its own refractive index, from the Sellmeier equation with catalogue coefficients for N-BK7, SF11 and fused silica. White light is traced as seven wavelengths from 400 to 670 nm, 45 nm apart, each carrying an equal share.',
    assumes:
      'Seven wavelengths stand in for the whole spectrum, and the index of air is 1 at every colour.',
  },
  {
    heading: 'When a ray stops',
    model:
      "A ray is followed from surface to surface until no surface lies ahead or it meets a blocker, a detector or an eye. A ray is dropped once it carries less than 0.2 % of the light it started with in the drawing, or 0.001 % in the eye's own pass, and it stops once it has met more than 40 surfaces. Hits 1e-6 mm or closer are ignored, as they are the surface the ray has just left.",
    assumes:
      "Light dropped by these limits is too faint to change what is drawn or measured; one drawing traces at most 40,000 segments and the eye's pass at most 400,000.",
  },
  {
    heading: 'Brightness',
    model:
      'The bench is a flat slice of the world. The Brightness setting chooses how a detector turns ray hits into a share of a source: 2D, or 3D equivalent.',
    assumes: `${brightness2d.assumes} ${brightness3d.assumes}`,
  },
  {
    heading: 'What the eye sees',
    model:
      'An eye collects the rays that enter its pupil from the front and groups them by source, emitting point, colour and the surfaces they crossed in order. For each group a least-squares fit finds the point closest to all its rays: a real image where the rays truly cross, a virtual image where they only seem to come from, an image at infinity when they arrive parallel, or one behind the eye when they are still converging. Each path is named in words, such as "2 refractions, 1 internal reflection".',
    assumes:
      'The eye is a pupil, not a model of the cornea and retina. Its own pass follows far more rays than are drawn, up to 1,000 per colour from each emitting point, and an image more than 20 m away counts as at infinity.',
  },
  {
    heading: 'Lens and mirror formulas',
    model:
      'Focal length figures use the thick-lens formula for a biconvex lens in air, 1/f = (n − 1) [1/R1 + 1/R2 − (n − 1) d / (n R1 R2)], where d is the depth of both curved faces plus a 1.5 mm edge and n is the glass index at 587.6 nm. A curved mirror focuses at f = R/2.',
    assumes:
      'Both formulas are paraxial: they hold for light close to the axis. The traced rays follow the exact surfaces, so light far from the axis focuses a little differently; that difference is spherical aberration.',
  },
  {
    heading: 'Images without an eye',
    model:
      'With Show images on, each Object is imaged through each flat mirror, curved mirror, lens and ball lens. From both ends of the arrow a cone of 5 rays, 1° wide, is aimed at the middle of the optic, and a least-squares fit finds where the rays leaving the last surface meet: a real image where they cross, a virtual one where they only seem to spread from. Where they do not meet at one point the image is drawn blurred, under a faint band as wide as their spread. A white Object is imaged at 587.6 nm.',
    assumes:
      'The narrow cone keeps the rays close to the axis, so the images are paraxial; partial reflections are left out, and a scene shows at most 50 object and optic pairs and 80 image arrows.',
  },
];
