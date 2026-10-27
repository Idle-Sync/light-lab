import {
  type DetectorReading,
  lensThickness,
  measuredFocalLength,
  refractiveIndex,
  type SceneObject,
  type Settings,
  spectrumOf,
  thickLensFocalLength,
} from '@light-lab/engine';
import { detectorReadout, lengthText, lensLabel, percent, type Readout, readout } from './readouts';

const dLine = 587.56;
const fLine = 486.13;
const cLine = 656.27;

const dispersionAssumes = 'Sellmeier dispersion fitted to catalogue glass data, air index 1.';
const fresnelAssumes = 'Fresnel reflectance for light at normal incidence, no coating.';
const idealMirrorAssumes = 'Ideal mirror: reflects all light, no coating loss.';
const sourceAssumes = 'Rays are samples of the source, not a count of photons.';
const geometryAssumes = 'Plain geometry of the shape as drawn, in millimetres.';

function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function glassReadouts(material: 'bk7' | 'sf11' | 'silica'): Readout[] {
  const nd = refractiveIndex(material, dLine);
  const nF = refractiveIndex(material, fLine);
  const nC = refractiveIndex(material, cLine);
  const normalReflectance = ((nd - 1) / (nd + 1)) ** 2;
  return [
    readout(
      'Refractive index nd',
      nd.toFixed(5),
      dispersionAssumes,
      'How much slower light travels in this glass than in air, which sets how strongly it bends.',
    ),
    readout(
      'Abbe number',
      ((nd - 1) / (nF - nC)).toFixed(2),
      dispersionAssumes,
      'A low number means the glass bends blue light much more than red, so colours spread out.',
    ),
    readout(
      'Reflectance at normal incidence',
      percent(normalReflectance),
      fresnelAssumes,
      'The share of head-on light that bounces off one glass surface instead of going in.',
    ),
  ];
}

function lensReadouts(lens: Extract<SceneObject, { kind: 'lens' }>): Readout[] {
  const focalAt = (nm: number) => thickLensFocalLength(lens, refractiveIndex(lens.material, nm));
  const focal = focalAt(dLine);
  const thickness = lensThickness(lens);
  const thickLensAssumes = 'Thick-lens formula for a biconvex lens in air, paraxial.';
  return [
    lensLabel(focal, measuredFocalLength(lens, dLine)),
    readout(
      'Focal shift, F to C line',
      `${(focalAt(cLine) - focalAt(fLine)).toFixed(3)} mm`,
      thickLensAssumes,
      'How far apart the focus of blue and red light lie; a bigger shift means more colour fringes.',
    ),
    readout(
      'Center thickness',
      `${thickness.toFixed(2)} mm`,
      'Both sags plus a 1.5 mm edge.',
      'How thick the glass is along the axis, in the middle of the lens.',
    ),
    readout(
      'f-number',
      (focal / lens.diameter).toFixed(2),
      thickLensAssumes,
      'The focal length divided by the width; a small number gathers more light into a smaller spot.',
    ),
    ...glassReadouts(lens.material),
  ];
}

function prismReadouts(prism: Extract<SceneObject, { kind: 'prism' }>): Readout[] {
  const minimumDeviation = (nm: number) =>
    degrees(2 * Math.asin(Math.min(1, refractiveIndex(prism.material, nm) * 0.5)) - Math.PI / 3);
  const assumes = 'Equilateral prism at minimum deviation.';
  return [
    readout(
      'Minimum deviation, d-line',
      `${minimumDeviation(dLine).toFixed(2)}°`,
      assumes,
      'The smallest angle by which the prism turns yellow light away from its original path.',
    ),
    readout(
      'Spread, F to C line',
      `${(minimumDeviation(fLine) - minimumDeviation(cLine)).toFixed(2)}°`,
      assumes,
      'The angle between the blue and the red ray leaving the prism, which is how wide the rainbow fans out.',
    ),
    ...glassReadouts(prism.material),
  ];
}

function ballReadouts(ball: Extract<SceneObject, { kind: 'ball' }>): Readout[] {
  const nd = refractiveIndex(ball.material, dLine);
  const effectiveFocal = (nd * ball.diameter) / (4 * (nd - 1));
  const normalReflectance = ((nd - 1) / (nd + 1)) ** 2;
  const afterOneBounce = (1 - normalReflectance) * normalReflectance * (1 - normalReflectance);
  const paraxialAssumes = 'Paraxial ball-lens formula, in air.';
  return [
    readout(
      'Effective focal length',
      `${effectiveFocal.toFixed(2)} mm`,
      paraxialAssumes,
      'The distance from the middle of the ball at which parallel light would meet.',
    ),
    readout(
      'Back focal length',
      `${(effectiveFocal - ball.diameter / 2).toFixed(2)} mm`,
      paraxialAssumes,
      'The distance from the back of the ball to the point where parallel light meets.',
    ),
    readout(
      'Head-on, after 1 internal bounce',
      percent(afterOneBounce),
      'Two surface transmissions and one internal reflection at normal incidence.',
      'The share of head-on light that bounces once inside the ball and comes back out, as in a rainbow.',
    ),
    ...glassReadouts(ball.material),
  ];
}

function arcMirrorReadouts(mirror: Extract<SceneObject, { kind: 'arcMirror' }>): Readout[] {
  const focal = (mirror.radius / 2) * (mirror.form === 'concave' ? 1 : -1);
  const sag = mirror.radius - Math.sqrt(mirror.radius ** 2 - mirror.diameter ** 2 / 4);
  return [
    readout(
      'Focal length, paraxial',
      `${focal.toFixed(1)} mm`,
      'Half the radius of curvature.',
      'The distance at which a concave mirror gathers parallel light; a convex mirror spreads it as if from behind.',
    ),
    readout(
      'f-number',
      Math.abs(focal / mirror.diameter).toFixed(2),
      'Paraxial focal length.',
      'The focal length divided by the width; a small number gathers more light into a smaller spot.',
    ),
    readout(
      'Sag',
      `${sag.toFixed(3)} mm`,
      geometryAssumes,
      'How far the middle of the curved surface sits behind its edges.',
    ),
    readout(
      'Reflectance',
      '100 %, ideal',
      idealMirrorAssumes,
      'The share of light the mirror sends back; here it loses none.',
    ),
  ];
}

function sourceReadouts(
  source: Extract<SceneObject, { kind: 'point' | 'beam' | 'object' }>,
): Readout[] {
  const wavelengths = spectrumOf(source.spectrum);
  const emitted = readout(
    'Rays emitted',
    String(source.rays * wavelengths.length),
    sourceAssumes,
    'How many rays the simulation follows from this source, one per wavelength per direction.',
  );
  if (source.kind === 'object') {
    return [
      readout(
        'Emitting points',
        '9, rays drawn from 2',
        sourceAssumes,
        'The object is modelled as nine glowing points along its height, and rays from two of them are drawn.',
      ),
    ];
  }
  if (source.kind === 'beam') {
    const spacing =
      source.rays > 1 ? `${(source.width / (source.rays - 1)).toFixed(2)} mm` : 'Single ray';
    return [
      readout(
        'Ray spacing',
        spacing,
        geometryAssumes,
        'The gap between neighbouring rays across the width of the beam.',
      ),
      emitted,
    ];
  }
  const range = source.spectrum === 'white' ? '7, 400 to 670 nm' : `${source.spectrum} nm`;
  const wavelengthReadout = readout(
    'Wavelengths',
    range,
    'White light is sampled at seven wavelengths.',
    'The colours of light this source sends out, given as wavelengths in nanometres.',
  );
  return [wavelengthReadout, emitted];
}

function detectorReadouts(
  reading: DetectorReading | undefined,
  brightness: Settings['brightness'],
): Readout[] {
  const power = detectorReadout(reading, brightness);
  if (!reading || reading.power <= 0) return [power];
  return [
    power,
    readout(
      'RMS spot width',
      lengthText(reading.rmsWidth),
      geometryAssumes,
      'How widely the light is spread along the detector; a small number means a sharp spot.',
    ),
    readout(
      'Centroid',
      lengthText(reading.centroid),
      'Measured along the detector from its centre.',
      'Where the middle of the light falls, measured from the centre of the detector.',
    ),
    readout(
      'Ray hits',
      reading.hits.toLocaleString('en-US'),
      sourceAssumes,
      'How many traced rays ended on the detector, which shows how much the numbers above can be trusted.',
    ),
  ];
}

/** Calls the engine for the numbers behind one object's readouts. */
export function objectReadouts(
  object: SceneObject,
  reading: DetectorReading | undefined,
  brightness: Settings['brightness'],
): Readout[] {
  switch (object.kind) {
    case 'lens':
      return lensReadouts(object);
    case 'prism':
      return prismReadouts(object);
    case 'ball':
      return ballReadouts(object);
    case 'arcMirror':
      return arcMirrorReadouts(object);
    case 'mirror':
      return [
        readout(
          'Reflectance',
          '100 %, ideal',
          idealMirrorAssumes,
          'The share of light the mirror sends back; here it loses none.',
        ),
      ];
    case 'point':
    case 'beam':
    case 'object':
      return sourceReadouts(object);
    case 'detector':
      return detectorReadouts(reading, brightness);
    case 'ruler':
      return [
        readout(
          'Length',
          `${object.length.toFixed(1)} mm`,
          geometryAssumes,
          'The distance between the two ends of the ruler.',
        ),
        readout(
          'Angle',
          `${Math.round(object.angle)}°`,
          geometryAssumes,
          'How far the ruler is turned from pointing along the bench.',
        ),
      ];
    case 'blocker':
    case 'eye':
      return [];
  }
}
