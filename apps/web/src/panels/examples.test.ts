import { decodeSceneLink, examples } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { exampleLinks } from './examples';

describe('exampleLinks', () => {
  it('lists bench, ball and magnifier as links that decode to the example', async () => {
    const links = await exampleLinks();
    expect(links.map((link) => link.name)).toEqual([
      'Optics bench',
      'Glass ball and eye',
      'Magnifying glass',
    ]);
    const scenes = [examples.bench, examples.ball, examples.magnifier];
    for (const [index, link] of links.entries()) {
      expect(link.href.startsWith('#z.')).toBe(true);
      expect(await decodeSceneLink(link.href)).toEqual(scenes[index]);
    }
  });
});
