import { encodeSceneLink, examples } from '@light-lab/engine';

/** The three example scenes as `#z.` links, named as the header shows them. */
export async function exampleLinks(): Promise<Array<{ name: string; href: string }>> {
  return [
    { name: 'Optics bench', href: `#${await encodeSceneLink(examples.bench)}` },
    { name: 'Glass ball and eye', href: `#${await encodeSceneLink(examples.ball)}` },
    { name: 'Magnifying glass', href: `#${await encodeSceneLink(examples.magnifier)}` },
  ];
}
