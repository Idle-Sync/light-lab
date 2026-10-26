import type { SceneObject } from '@light-lab/engine';

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
