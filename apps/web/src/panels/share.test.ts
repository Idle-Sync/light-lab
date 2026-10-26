import { decodeSceneLink, encodeSceneLink, examples } from '@light-lab/engine';
import { describe, expect, it, vi } from 'vitest';
import { shareSceneLink } from './share';

vi.mock('@light-lab/engine', async (importOriginal) => {
  const engine = await importOriginal<typeof import('@light-lab/engine')>();
  return { ...engine, encodeSceneLink: vi.fn(engine.encodeSceneLink) };
});

describe('shareSceneLink', () => {
  it('copies the #z. link and returns it', async () => {
    const copied: string[] = [];
    const shared = await shareSceneLink(examples.ball, async (text) => {
      copied.push(text);
    });
    expect(shared.copied).toBe(true);
    expect(shared.link.startsWith('#z.')).toBe(true);
    expect(copied).toEqual([shared.link]);
    expect(await decodeSceneLink(shared.link)).toEqual(examples.ball);
  });

  it('encodes once and still yields the link when the clipboard refuses', async () => {
    vi.mocked(encodeSceneLink).mockClear();
    const shared = await shareSceneLink(
      examples.ball,
      async () => {
        throw new DOMException('Write permission denied.', 'NotAllowedError');
      },
      'https://example.org/',
    );
    expect(encodeSceneLink).toHaveBeenCalledTimes(1);
    expect(shared.copied).toBe(false);
    expect(shared.link.startsWith('https://example.org/#z.')).toBe(true);
  });
});
