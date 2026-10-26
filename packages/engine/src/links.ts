import { migrateScene } from './migrate';
import { type Scene, SceneError } from './scene';

// A link is the URL fragment: "z." + base64url(deflate-raw(JSON)), or "j." + base64url(JSON).

/** Encodes a scene as a compressed `z.` link. */
export async function encodeSceneLink(scene: Scene): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(scene));
  const compressed = await pipeBytes(json, new CompressionStream('deflate-raw'));
  return `z.${toBase64Url(compressed)}`;
}

/** Decodes a `z.` or `j.` link, with or without the leading `#`; throws `SceneError`. */
export async function decodeSceneLink(hash: string): Promise<Scene> {
  const link = hash.startsWith('#') ? hash.slice(1) : hash;
  const prefix = link.slice(0, 2);
  const payload = fromBase64Url(link.slice(2));
  if (prefix === 'j.') return migrateScene(parseJson(payload));
  if (prefix !== 'z.') throw new SceneError('Scene link must start with z. or j.');

  let inflated: Uint8Array<ArrayBuffer>;
  try {
    inflated = await pipeBytes(payload, new DecompressionStream('deflate-raw'));
  } catch (error) {
    throw new SceneError('Scene link is not valid compressed data', { cause: error });
  }
  return migrateScene(parseJson(inflated));
}

async function pipeBytes(
  bytes: Uint8Array<ArrayBuffer>,
  transform: TransformStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new SceneError('Scene link does not hold JSON', { cause: error });
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  let binary: string;
  try {
    binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
  } catch (error) {
    throw new SceneError('Scene link is not valid base64url', { cause: error });
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
