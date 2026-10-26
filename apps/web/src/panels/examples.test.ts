import { decodeSceneLink, examples } from '@light-lab/engine';
import { describe, expect, it } from 'vitest';
import { exampleLinks } from './examples';
import { shareSceneLink } from './share';

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

describe('shareSceneLink', () => {
  it('copies the #z. link and returns it', async () => {
    const copied: string[] = [];
    const link = await shareSceneLink(examples.ball, async (text) => {
      copied.push(text);
    });
    expect(link.startsWith('#z.')).toBe(true);
    expect(copied).toEqual([link]);
    expect(await decodeSceneLink(link)).toEqual(examples.ball);
  });

  it('lets a clipboard failure reach the caller so it can show the link', async () => {
    await expect(
      shareSceneLink(examples.ball, async () => {
        throw new Error('denied');
      }),
    ).rejects.toThrow('denied');
  });
});
