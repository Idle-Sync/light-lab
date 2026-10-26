import { describe, expect, it } from 'vitest';
import { shortcutFor } from './shortcuts';

const plain = { metaKey: false, ctrlKey: false, shiftKey: false, inTextInput: false };

describe('shortcutFor', () => {
  it('maps command or control plus Z to undo and with Shift to redo', () => {
    expect(shortcutFor({ ...plain, key: 'z', metaKey: true })).toBe('undo');
    expect(shortcutFor({ ...plain, key: 'z', ctrlKey: true })).toBe('undo');
    expect(shortcutFor({ ...plain, key: 'Z', metaKey: true, shiftKey: true })).toBe('redo');
    expect(shortcutFor({ ...plain, key: 'z', ctrlKey: true, shiftKey: true })).toBe('redo');
  });

  it('maps Delete and Backspace to delete', () => {
    expect(shortcutFor({ ...plain, key: 'Delete' })).toBe('delete');
    expect(shortcutFor({ ...plain, key: 'Backspace' })).toBe('delete');
  });

  it('maps command or control plus D to duplicate', () => {
    expect(shortcutFor({ ...plain, key: 'd', metaKey: true })).toBe('duplicate');
    expect(shortcutFor({ ...plain, key: 'd', ctrlKey: true })).toBe('duplicate');
  });

  it('ignores unrelated keys and bare letters', () => {
    expect(shortcutFor({ ...plain, key: 'z' })).toBeNull();
    expect(shortcutFor({ ...plain, key: 'd' })).toBeNull();
    expect(shortcutFor({ ...plain, key: 'a', metaKey: true })).toBeNull();
  });

  it('returns null for every shortcut while typing in a text field', () => {
    const typing = { ...plain, inTextInput: true };
    expect(shortcutFor({ ...typing, key: 'z', metaKey: true })).toBeNull();
    expect(shortcutFor({ ...typing, key: 'z', metaKey: true, shiftKey: true })).toBeNull();
    expect(shortcutFor({ ...typing, key: 'Delete' })).toBeNull();
    expect(shortcutFor({ ...typing, key: 'Backspace' })).toBeNull();
    expect(shortcutFor({ ...typing, key: 'd', ctrlKey: true })).toBeNull();
  });
});
