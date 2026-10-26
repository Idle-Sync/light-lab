import type { Store } from './store';

export type Shortcut = 'undo' | 'redo' | 'delete' | 'duplicate';

export interface ShortcutKey {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  inTextInput: boolean;
}

/** Maps a key press to an editing shortcut; null for other keys and while the user is typing. */
export function shortcutFor(press: ShortcutKey): Shortcut | null {
  if (press.inTextInput) return null;
  if (press.key === 'Delete' || press.key === 'Backspace') return 'delete';

  if (!press.metaKey && !press.ctrlKey) return null;
  const key = press.key.toLowerCase();
  if (key === 'z') return press.shiftKey ? 'redo' : 'undo';
  if (key === 'd') return 'duplicate';
  return null;
}

// Range, checkbox, radio and button inputs take no typed text, so shortcuts stay active on them.
const textInputTypes = ['text', 'number', 'search', 'url', 'email'];

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && textInputTypes.includes(target.type);
}

/** Installs the keydown listener for the editing shortcuts; returns a function that removes it. */
export function bindShortcuts(store: Store): () => void {
  function onKeyDown(event: KeyboardEvent): void {
    const shortcut = shortcutFor({
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      inTextInput: isTextInput(event.target),
    });
    if (shortcut === null) return;

    const { selectedId } = store.getState();
    if (shortcut === 'undo') store.undo();
    else if (shortcut === 'redo') store.redo();
    else if (selectedId === null) return;
    else if (shortcut === 'delete') store.removeObject(selectedId);
    else store.duplicateObject(selectedId);
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
