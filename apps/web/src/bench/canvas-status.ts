import { useSyncExternalStore } from 'react';

/** What the bench canvas reports about itself: its size in CSS pixels and its last draw time. */
export interface CanvasStatus {
  width: number;
  height: number;
  /** Time spent inside the last draw callback, in ms. */
  frameMs: number;
}

let status: CanvasStatus = { width: 0, height: 0, frameMs: 0 };
const listeners = new Set<() => void>();

export function setCanvasStatus(changes: Partial<CanvasStatus>): void {
  status = { ...status, ...changes };
  for (const listener of listeners) listener();
}

export function getCanvasStatus(): CanvasStatus {
  return status;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribes a component to one value of the canvas status. */
export function useCanvasStatus<T>(select: (status: CanvasStatus) => T): T {
  return useSyncExternalStore(subscribe, () => select(status));
}
