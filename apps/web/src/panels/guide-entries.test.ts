import type { EyeAnalysis, EyeGroup, ObjectKind } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { eyeReadouts } from './eye-readouts';
import {
  guideReadouts,
  litDetectorReading,
  rayModelSections,
  sampleObjects,
  toolGuide,
} from './guide-entries';
import { kindFields, kindTitles } from './inspector-fields';
import { objectReadouts } from './object-readouts';
import { detectorReadout } from './readouts';
import { toolDescriptions } from './tool-descriptions';

const kinds = Object.keys(kindTitles) as ObjectKind[];

const group: EyeGroup = {
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

function analysisOf(eyeId: number): EyeAnalysis {
  return {
    eyeId,
    groups: [group],
    rows: [
      {
        path: 't0t0',
        power: 0.4,
        transmission: 0.9,
        rayCount: 5,
        color: [255, 200, 0],
        top: group,
      },
    ],
    totalIntoPupil: 0.4,
  };
}

/** Every assumes string the inspector can show for one object of `kind`. */
function inspectorAssumes(kind: ObjectKind): string[] {
  const object = sampleObjects[kind];
  const assumes: string[] = [];
  for (const brightness of ['2d', '3d'] as const) {
    for (const reading of [undefined, litDetectorReading]) {
      for (const item of objectReadouts(object, reading, brightness)) assumes.push(item.assumes);
    }
  }
  if (kind === 'eye') {
    for (const item of eyeReadouts(null, object.id).readouts) assumes.push(item.assumes);
    for (const item of eyeReadouts(analysisOf(object.id), object.id).readouts) {
      assumes.push(item.assumes);
    }
  }
  return assumes;
}

describe('toolGuide', () => {
  it('has an entry for every tool, opening with its toolbar description', () => {
    expect(Object.keys(toolGuide).sort()).toEqual([...kinds].sort());
    for (const kind of kinds) {
      expect(toolGuide[kind].title).toBe(kindTitles[kind]);
      expect(toolGuide[kind].what).toContain(toolDescriptions[kind].what);
    }
  });

  it('explains every control the inspector shows', () => {
    for (const kind of kinds) {
      const named = toolGuide[kind].controls.map((control) => control.label);
      const shown = kindFields[kind].map((field) => field.label);
      if (kind === 'lens') shown.push('Focal length', 'Advanced: surface radii');
      for (const label of shown) expect(named, kind).toContain(label);
      for (const control of toolGuide[kind].controls) {
        expect(control.explanation, `${kind} ${control.label}`).toMatch(/^[A-Z].*\.$/);
      }
    }
  });

  it('takes its readouts from the inspector, not from hand-written text', () => {
    for (const kind of kinds) {
      expect(toolGuide[kind].readouts).toEqual(guideReadouts(kind));
    }
    const lens = objectReadouts(sampleObjects.lens, undefined, '2d');
    expect(guideReadouts('lens')).toEqual(
      lens.map((item) => ({ label: item.label, explanation: item.explanation })),
    );
  });

  it('lists the detector readouts of both an unlit and a lit detector', () => {
    expect(litDetectorReading.power).toBeGreaterThan(0);
    expect(guideReadouts('detector').map((item) => item.label)).toEqual([
      'Power',
      'Power, share of one source',
      'RMS spot width',
      'Centroid',
      'Ray hits',
    ]);
  });

  it('lists the eye readouts with and without light in the pupil', () => {
    expect(guideReadouts('eye').map((item) => item.label)).toEqual([
      'Light into the pupil',
      'Distinct light paths',
    ]);
  });

  it('states every assumption the inspector shows, each in plain words', () => {
    for (const kind of kinds) {
      const listed = toolGuide[kind].assumptions.map((item) => item.assumes);
      for (const assumes of inspectorAssumes(kind)) expect(listed, kind).toContain(assumes);
      expect(toolGuide[kind].assumptions.length, kind).toBeGreaterThan(0);
      for (const item of toolGuide[kind].assumptions) {
        expect(item.meaning, `${kind}: ${item.assumes}`).toMatch(/^[A-Z].*\.$/);
      }
    }
  });
});

describe('rayModelSections', () => {
  function sectionText(heading: string): string {
    const section = rayModelSections.find((candidate) => candidate.heading === heading);
    if (!section) throw new Error(`no section "${heading}"`);
    expect(section.model, heading).toMatch(/^[A-Z].*\.$/);
    expect(section.assumes, heading).toMatch(/^[A-Z].*\.$/);
    return `${section.model} ${section.assumes}`;
  }

  it('states that light travels in straight lines', () => {
    expect(sectionText('Light travels in straight lines')).toContain('straight line');
  });

  it("states Snell's law and total internal reflection", () => {
    const text = sectionText('Refraction');
    expect(text).toContain('Snell');
    expect(text).toContain('total internal reflection');
  });

  it('states Fresnel partial reflection and the polarization switch', () => {
    const text = sectionText('Partial reflection');
    for (const words of [
      'Fresnel',
      'Partial reflections',
      'Polarization',
      'Unpolarized',
      's or p polarized',
    ]) {
      expect(text).toContain(words);
    }
  });

  it('states Sellmeier dispersion and white light as seven wavelengths', () => {
    const text = sectionText('Colours and dispersion');
    for (const words of ['Sellmeier', 'seven wavelengths', '400', '670 nm']) {
      expect(text).toContain(words);
    }
  });

  it('states when a ray stops, with the numbers the trace uses', () => {
    const text = sectionText('When a ray stops');
    for (const words of ['0.2 %', '0.001 %', '40 surfaces', '1e-6 mm']) {
      expect(text).toContain(words);
    }
  });

  it('states the 2D and 3D-equivalent brightness rules as the detector does', () => {
    const text = sectionText('Brightness');
    expect(text).toContain(detectorReadout(undefined, '2d').assumes);
    expect(text).toContain(detectorReadout(undefined, '3d').assumes);
  });

  it('states how the eye finds its images', () => {
    const text = sectionText('What the eye sees');
    for (const words of ['pupil', 'least-squares', 'real', 'virtual']) {
      expect(text).toContain(words);
    }
  });

  it('states the thick-lens and mirror formulas', () => {
    const text = sectionText('Lens and mirror formulas');
    for (const words of ['thick-lens', '1.5 mm', 'f = R/2', '587.6 nm']) {
      expect(text).toContain(words);
    }
  });

  it('states how images are found without an eye', () => {
    const text = sectionText('Images without an eye');
    for (const words of ['Show images', 'paraxial', 'blurred', '50', '80']) {
      expect(text).toContain(words);
    }
  });
});
