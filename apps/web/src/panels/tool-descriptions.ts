import type { ObjectKind } from '@light-lab/engine';

/** What each bench object is and how to use it, shown in the toolbar tooltip. */
export const toolDescriptions: Record<ObjectKind, { what: string; use: string }> = {
  point: {
    what: 'A small lamp that sends light out in all directions.',
    use: 'Place it in front of a lens to see the light bend.',
  },
  beam: {
    what: 'A wide stream of parallel light, like a distant sun.',
    use: 'Aim it at a lens or prism and watch where the rays meet.',
  },
  object: {
    what: 'A glowing arrow that stands in for something you look at.',
    use: 'Put a lens beyond it and an eye after that to see its image.',
  },
  mirror: {
    what: 'A flat mirror that reflects light.',
    use: 'Turn it to send a beam in a new direction.',
  },
  arcMirror: {
    what: 'A curved mirror, concave or convex.',
    use: 'Shine a beam on a concave one to bring the light to a focus.',
  },
  lens: {
    what: 'A glass lens that bends light, set by its focal length.',
    use: 'Put a beam through it and place a detector at the focus.',
  },
  prism: {
    what: 'A glass triangle that bends light and spreads white light into colours.',
    use: 'Shine white light on one side to see a rainbow come out.',
  },
  ball: {
    what: 'A glass ball that acts as a strong lens.',
    use: 'Send a beam through it to see the light gather behind.',
  },
  blocker: {
    what: 'An opaque bar that stops light.',
    use: 'Put it in a beam to cast a shadow or make a slit.',
  },
  detector: {
    what: 'A sensor that measures where and how brightly light lands on it.',
    use: 'Place it where the light meets and read the spot it makes.',
  },
  ruler: {
    what: 'A ruler for measuring distances on the bench.',
    use: 'Drag its ends to measure between any two points.',
  },
  eye: {
    what: 'A viewer that shows what a person looking from that spot would see.',
    use: 'Point it at a lens to see an image, real or virtual.',
  },
};
