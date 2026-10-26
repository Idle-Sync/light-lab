import { encodeSceneLink, type Scene } from '@light-lab/engine';

export interface SharedLink {
  /** `baseUrl` plus the `#z.` fragment. */
  link: string;
  /** False when the clipboard refused the link, so the caller shows it for copying by hand. */
  copied: boolean;
}

/** Encodes a link to the scene once, then tries to copy it; a failed copy returns `copied: false`. */
export async function shareSceneLink(
  scene: Scene,
  writeText: (text: string) => Promise<void>,
  baseUrl = '',
): Promise<SharedLink> {
  const link = `${baseUrl}#${await encodeSceneLink(scene)}`;
  try {
    await writeText(link);
  } catch {
    // Any failure to copy leaves the user without the link: a refused permission rejects with a
    // DOMException, and a page without the Clipboard API (plain http) throws a TypeError.
    return { link, copied: false };
  }
  return { link, copied: true };
}

/** Writes text with the Clipboard API; throws a TypeError where the browser has none. */
export function copyWithClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
