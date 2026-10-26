import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { examples } from './examples';
import { decodeSceneLink, encodeSceneLink } from './links';
import { SceneError } from './scene';

function plainLink(json: string): string {
  return `j.${Buffer.from(json).toString('base64url')}`;
}

describe('scene links', () => {
  it('round-trips the bench example through a compressed link', async () => {
    const link = await encodeSceneLink(examples.bench);
    expect(link.startsWith('z.')).toBe(true);
    expect(await decodeSceneLink(link)).toEqual(examples.bench);
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
});
