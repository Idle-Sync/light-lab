import type { SceneObject } from '@light-lab/engine';
import type { Store } from '../store';

export type KeyEdit = Partial<Pick<SceneObject, 'x' | 'y' | 'angle'>>;

const rotateStep = 5;

/** The edit a key press makes to the selected object, or null for keys that edit nothing. */
export function keyToSceneEdit(
  key: string,
  shiftKey: boolean,
  object: SceneObject,
): KeyEdit | null {
  const nudge = shiftKey ? 10 : 1;
  switch (key) {
    case 'ArrowLeft':
      return { x: object.x - nudge };
    case 'ArrowRight':
      return { x: object.x + nudge };
    // Bench y grows downward, like the screen.
    case 'ArrowUp':
      return { y: object.y - nudge };
    case 'ArrowDown':
      return { y: object.y + nudge };
    case '[':
      return { angle: object.angle - rotateStep };
    case ']':
      return { angle: object.angle + rotateStep };
    default:
      return null;
  }
}

export interface KeyPress {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

/**
 * Moves or turns the selected object for one key press, one history entry per press. Returns
 * whether the press was used, so the caller can stop the browser's default for it.
 */
export function applyKeyEdit(store: Store, press: KeyPress): boolean {
  // Meta+[ is browser Back and Ctrl+arrows move between spaces or words; they are not edits.
  if (press.metaKey || press.ctrlKey || press.altKey) return false;
  const { scene, selectedId } = store.getState();
  const selected = scene.objects.find((object) => object.id === selectedId);
  if (!selected) return false;
  const edit = keyToSceneEdit(press.key, press.shiftKey, selected);
  if (!edit) return false;
  store.updateObject(selected.id, edit);
  return true;
}
