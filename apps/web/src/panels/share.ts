import { encodeSceneLink, type Scene } from '@light-lab/engine';

export interface SharedLink {
  /** `baseUrl` plus the `#z.` fragment. */
  link: string;
  /** False when the clipboard refused the link, so the caller shows it for copying by hand. */
  copied: boolean;
}

/** Encodes a link to the scene once, then tries to copy it. */
export async function shareSceneLink(
  scene: Scene,
  writeText: (text: string) => Promise<void>,
  baseUrl = '',
): Promise<SharedLink> {
  const link = `${baseUrl}#${await encodeSceneLink(scene)}`;
  try {
    await writeText(link);
  } catch (error) {
    // The Clipboard API rejects with a DOMException when permission is denied or the page lacks focus.
    if (error instanceof DOMException) return { link, copied: false };
    throw error;
  }
  return { link, copied: true };
}
