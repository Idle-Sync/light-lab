import type { LensObject, Material, Spectrum } from './scene';

type LensShape = Pick<LensObject, 'radius1' | 'radius2' | 'diameter'>;

// Sellmeier coefficients from the Schott and Heraeus catalogues; C in µm².
export const glasses: Record<Material, { label: string; B: number[]; C: number[] }> = {
  bk7: {
    label: 'N-BK7',
    B: [1.03961212, 0.231792344, 1.01046945],
    C: [0.00600069867, 0.0200179144, 103.560653],
  },
  sf11: {
    label: 'SF11',
    B: [1.73759695, 0.313747346, 1.89878101],
    C: [0.013188707, 0.0623068142, 155.23629],
  },
  silica: {
    label: 'Fused silica',
    B: [0.6961663, 0.4079426, 0.8974794],
    C: [0.00467914826, 0.0135120631, 97.9340025],
  },
};

export const whiteWavelengths = [400, 445, 490, 535, 580, 625, 670];

/** Refractive index from the Sellmeier equation, wavelength in nm. */
export function refractiveIndex(material: Material, nm: number): number {
  const glass = glasses[material];
  const micrometresSquared = (nm / 1000) ** 2;
  let sum = 1;
  for (let term = 0; term < 3; term += 1) {
    sum += (glass.B[term] * micrometresSquared) / (micrometresSquared - glass.C[term]);
  }
  return Math.sqrt(sum);
}

/** The wavelengths a source emits, in nm. */
export function spectrumOf(spectrum: Spectrum): number[] {
  if (spectrum === 'white') return [...whiteWavelengths];
  return [spectrum];
}

/** Centre thickness of a biconvex lens: both sags plus a 1.5 mm edge. */
export function lensThickness(lens: LensShape): number {
  const halfAperture = lens.diameter / 2;
  const sag1 = lens.radius1 - Math.sqrt(lens.radius1 ** 2 - halfAperture ** 2);
  const sag2 = lens.radius2 - Math.sqrt(lens.radius2 ** 2 - halfAperture ** 2);
  return sag1 + sag2 + 1.5;
}

/** Focal length of a biconvex lens from the thick-lens lensmaker equation, in mm. */
export function thickLensFocalLength(lens: LensShape, n: number): number {
  const thickness = lensThickness(lens);
  const power =
    (n - 1) *
    (1 / lens.radius1 +
      1 / lens.radius2 -
      ((n - 1) * thickness) / (n * lens.radius1 * lens.radius2));
  return 1 / power;
}
