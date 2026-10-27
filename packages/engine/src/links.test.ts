import { readFileSync } from 'node:fs';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { decodeSceneLink, encodeSceneLink } from './links';
import { parseScene, type Scene, SceneError } from './scene';

function plainLink(json: string): string {
  return `j.${Buffer.from(json).toString('base64url')}`;
}

async function inflateLink(link: string): Promise<string> {
  return inflateRawSync(Buffer.from(link.slice(2), 'base64url')).toString();
}

// One sample link per shipped scene version, keyed by version; add one with every new version.
const sampleLinks: Record<string, string> = JSON.parse(
  readFileSync(new URL('../test/fixtures/links.json', import.meta.url), 'utf8'),
);

describe('scene links', () => {
  it('round-trips the bench example through a compressed link', async () => {
    const link = await encodeSceneLink(examples.bench);
    expect(link.startsWith('z.')).toBe(true);
    expect(await decodeSceneLink(link)).toEqual(examples.bench);
  });

  // Settings at their defaults stay out of the link, so new settings do not lengthen old scenes.
  it('keeps the link of the bench example under 500 characters', async () => {
    expect((await encodeSceneLink(examples.bench)).length).toBeLessThan(500);
  });

  it('round-trips settings that differ from their defaults', async () => {
    const scene: Scene = {
      ...examples.bench,
      settings: {
        ...examples.bench.settings,
        brightness: '3d',
        grid: { show: false, size: 2.5, snap: true },
        sightLines: false,
        showImages: false,
      },
    };
    expect(await decodeSceneLink(await encodeSceneLink(scene))).toEqual(scene);
  });

  it('leaves a default showImages out of the link', async () => {
    const link = await encodeSceneLink(examples.bench);
    const inflated = JSON.parse(await inflateLink(link));
    expect(inflated.settings).not.toHaveProperty('showImages');
  });

  it('reads a link with the leading # of location.hash', async () => {
    const link = await encodeSceneLink(examples.ball);
    expect(await decodeSceneLink(`#${link}`)).toEqual(examples.ball);
  });

  it('decodes a plain j. link', async () => {
    const link = plainLink(JSON.stringify(examples.magnifier));
    expect(await decodeSceneLink(link)).toEqual(examples.magnifier);
  });

  it('rejects a compressed link that does not inflate', async () => {
    await expect(decodeSceneLink('z.garbage')).rejects.toBeInstanceOf(SceneError);
  });

  it('rejects a plain link that is not JSON', async () => {
    await expect(decodeSceneLink(plainLink('not json'))).rejects.toBeInstanceOf(SceneError);
  });

  it('rejects a link without a known prefix', async () => {
    await expect(decodeSceneLink('q.abc')).rejects.toBeInstanceOf(SceneError);
  });

  // A few kilobytes of deflate can expand to gigabytes; decoding must stop at the limit.
  it('rejects a compressed link that inflates past 1 MB', async () => {
    const twoMegabytes = Buffer.alloc(2 * 1024 * 1024, ' ');
    const link = `z.${deflateRawSync(twoMegabytes).toString('base64url')}`;
    expect(link.length).toBeLessThan(64 * 1024);
    await expect(decodeSceneLink(link)).rejects.toThrowError(SceneError);
    await expect(decodeSceneLink(link)).rejects.toThrowError(/1048576-byte limit/);
  });

  it('rejects a link longer than 64 KB before decoding it', async () => {
    const link = `j.${'A'.repeat(64 * 1024)}`;
    await expect(decodeSceneLink(link)).rejects.toThrowError(/65536-character limit/);
  });

  it.each(Object.entries(sampleLinks))(
    'decodes the sample link of version %s',
    async (version, link) => {
      const scene = await decodeSceneLink(link);
      expect(scene.v).toBe(3);
      expect(scene).toEqual(parseScene(scene));
      expect(version).toMatch(/^\d+$/);
    },
  );

  it('keeps a sample link for every shipped version', () => {
    expect(Object.keys(sampleLinks)).toEqual(['1', '2', '3']);
  });

  it('keeps the version 3 link under 500 characters', () => {
    expect(sampleLinks['3'].length).toBeLessThan(500);
  });

  it('keeps the version 3 sample on settings that differ from their defaults', async () => {
    const scene = await decodeSceneLink(sampleLinks['3']);
    expect(scene.settings).toEqual({
      ...examples.bench.settings,
      brightness: '3d',
      sightLines: false,
      showImages: false,
    });
  });

  it('keeps the version 2 bench link under 500 characters', () => {
    expect(sampleLinks['2'].length).toBeLessThan(500);
  });

  it('keeps the version 2 sample equal to the bench example', async () => {
    expect(await decodeSceneLink(sampleLinks['2'])).toEqual(examples.bench);
  });

  it('keeps the version 1 bench link under 500 characters', () => {
    expect(sampleLinks['1'].length).toBeLessThan(500);
  });

  it('opens the version 1 sample as the bench example', async () => {
    expect(await decodeSceneLink(sampleLinks['1'])).toEqual(examples.bench);
  });
});
