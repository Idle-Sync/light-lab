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
    readout('Refractive index nd', nd.toFixed(5), dispersionAssumes),
    readout('Abbe number', ((nd - 1) / (nF - nC)).toFixed(2), dispersionAssumes),
    readout('Reflectance at normal incidence', percent(normalReflectance), fresnelAssumes),
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
    ),
    readout('Center thickness', `${thickness.toFixed(2)} mm`, 'Both sags plus a 1.5 mm edge.'),
    readout('f-number', (focal / lens.diameter).toFixed(2), thickLensAssumes),
    ...glassReadouts(lens.material),
  ];
}

function prismReadouts(prism: Extract<SceneObject, { kind: 'prism' }>): Readout[] {
  const minimumDeviation = (nm: number) =>
    degrees(2 * Math.asin(Math.min(1, refractiveIndex(prism.material, nm) * 0.5)) - Math.PI / 3);
  const assumes = 'Equilateral prism at minimum deviation.';
  return [
    readout('Minimum deviation, d-line', `${minimumDeviation(dLine).toFixed(2)}°`, assumes),
    readout(
      'Spread, F to C line',
      `${(minimumDeviation(fLine) - minimumDeviation(cLine)).toFixed(2)}°`,
      assumes,
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
    readout('Effective focal length', `${effectiveFocal.toFixed(2)} mm`, paraxialAssumes),
    readout(
      'Back focal length',
      `${(effectiveFocal - ball.diameter / 2).toFixed(2)} mm`,
      paraxialAssumes,
    ),
    readout(
      'Head-on, after 1 internal bounce',
      percent(afterOneBounce),
      'Two surface transmissions and one internal reflection at normal incidence.',
    ),
    ...glassReadouts(ball.material),
  ];
}

function arcMirrorReadouts(mirror: Extract<SceneObject, { kind: 'arcMirror' }>): Readout[] {
  const focal = (mirror.radius / 2) * (mirror.form === 'concave' ? 1 : -1);
  const sag = mirror.radius - Math.sqrt(mirror.radius ** 2 - mirror.diameter ** 2 / 4);
  return [
    readout('Focal length, paraxial', `${focal.toFixed(1)} mm`, 'Half the radius of curvature.'),
    readout('f-number', Math.abs(focal / mirror.diameter).toFixed(2), 'Paraxial focal length.'),
    readout('Sag', `${sag.toFixed(3)} mm`, geometryAssumes),
    readout('Reflectance', '100 %, ideal', idealMirrorAssumes),
  ];
}

function sourceReadouts(
  source: Extract<SceneObject, { kind: 'point' | 'beam' | 'object' }>,
): Readout[] {
  const wavelengths = spectrumOf(source.spectrum);
  const emitted = readout('Rays emitted', String(source.rays * wavelengths.length), sourceAssumes);
  if (source.kind === 'object') {
    return [readout('Emitting points', '9, rays drawn from 2', sourceAssumes)];
  }
  if (source.kind === 'beam') {
    const spacing =
      source.rays > 1 ? `${(source.width / (source.rays - 1)).toFixed(2)} mm` : 'Single ray';
    return [readout('Ray spacing', spacing, geometryAssumes), emitted];
  }
  const range = source.spectrum === 'white' ? '7, 400 to 670 nm' : `${source.spectrum} nm`;
  return [readout('Wavelengths', range, 'White light is sampled at seven wavelengths.'), emitted];
}

function detectorReadouts(
  reading: DetectorReading | undefined,
  brightness: Settings['brightness'],
): Readout[] {
  const power = detectorReadout(reading, brightness);
  if (!reading || reading.power <= 0) return [power];
  return [
    power,
    readout('RMS spot width', lengthText(reading.rmsWidth), geometryAssumes),
    readout(
      'Centroid',
      lengthText(reading.centroid),
      'Measured along the detector from its centre.',
    ),
    readout('Ray hits', reading.hits.toLocaleString('en-US'), sourceAssumes),
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
      return [readout('Reflectance', '100 %, ideal', idealMirrorAssumes)];
    case 'point':
    case 'beam':
    case 'object':
      return sourceReadouts(object);
    case 'detector':
      return detectorReadouts(reading, brightness);
    case 'ruler':
      return [
        readout('Length', `${object.length.toFixed(1)} mm`, geometryAssumes),
        readout('Angle', `${Math.round(object.angle)}°`, geometryAssumes),
      ];
    case 'blocker':
    case 'eye':
      return [];
  }
}
