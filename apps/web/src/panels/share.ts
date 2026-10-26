import { encodeSceneLink, type Scene } from '@light-lab/engine';

/**
 * Copies a link to the scene (`baseUrl` plus the `#z.` fragment) and returns it.
 * A failed copy throws, so the caller can show the link for the user to copy by hand.
 */
export async function shareSceneLink(
  scene: Scene,
  writeText: (text: string) => Promise<void>,
  baseUrl = '',
): Promise<string> {
  const link = `${baseUrl}#${await encodeSceneLink(scene)}`;
  await writeText(link);
  return link;
}
