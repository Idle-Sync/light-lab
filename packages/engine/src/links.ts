import { migrateScene } from './migrate';
import { type Scene, SceneError } from './scene';

// A link is the URL fragment: "z." + base64url(deflate-raw(JSON)), or "j." + base64url(JSON).

// Links come from strangers; both limits sit far above any real scene (the bench is under 1 KB)
// so a crafted link cannot inflate to gigabytes and hang the tab.
const maxLinkCharacters = 64 * 1024;
const maxSceneBytes = 1024 * 1024;

/** Encodes a scene as a compressed `z.` link. */
export async function encodeSceneLink(scene: Scene): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(scene));
  const compressed = await pipeBytes(json, new CompressionStream('deflate-raw'));
  return `z.${toBase64Url(compressed)}`;
}

/** Decodes a `z.` or `j.` link, with or without the leading `#`; throws `SceneError`. */
export async function decodeSceneLink(hash: string): Promise<Scene> {
  const link = hash.startsWith('#') ? hash.slice(1) : hash;
  if (link.length > maxLinkCharacters) {
    throw new SceneError(`Scene link is longer than the ${maxLinkCharacters}-character limit`);
  }
  const prefix = link.slice(0, 2);
  const payload = fromBase64Url(link.slice(2));
  if (prefix === 'j.') return migrateScene(parseJson(payload));
  if (prefix !== 'z.') throw new SceneError('Scene link must start with z. or j.');
  return migrateScene(parseJson(await inflate(payload)));
}

async function inflate(compressed: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([compressed])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  for (;;) {
    const chunk = await readInflatedChunk(reader);
    if (chunk === null) break;
    byteCount += chunk.byteLength;
    if (byteCount > maxSceneBytes) {
      await reader.cancel();
      throw new SceneError(`Scene link inflates past the ${maxSceneBytes}-byte limit`);
    }
    chunks.push(chunk);
  }

  const inflated = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) {
    inflated.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return inflated;
}

async function readInflatedChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<Uint8Array | null> {
  try {
    const { done, value } = await reader.read();
    return done ? null : value;
  } catch (error) {
    throw new SceneError('Scene link is not valid compressed data', { cause: error });
  }
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
