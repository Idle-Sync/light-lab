import {
  defaultSettings,
  fieldRanges,
  type GridSettings,
  maxObjects,
  type ObjectKind,
  parseSceneObject,
  type Scene,
  type SceneObject,
  type Settings,
  wrapAngle,
} from '@light-lab/engine';
import { useSyncExternalStore } from 'react';
import { extentOf, type Point } from './bench/shapes';
import type { SceneResults } from './engine-worker';

export interface View {
  /** Screen pixels per mm. */
  scale: number;
  /** The bench point, in mm, shown at the centre of the canvas. */
  offsetX: number;
  offsetY: number;
}

export type EyeViewSize = 'small' | 'medium' | 'large';

/** Height in pixels of the "what the eye sees" strip for each size. */
export const eyeStripHeights: Record<EyeViewSize, number> = { small: 60, medium: 130, large: 240 };

export interface AppState {
  scene: Scene;
  selectedId: number | null;
  view: View;
  eyeView: EyeViewSize;
  results: SceneResults | null;
  traceCount: number;
  linkError: string | null;
}

// What the toolbar adds, from the prototype; the store sets id and position.
const newObjects = {
  point: { kind: 'point', id: 0, x: 0, y: 0, angle: 0, cone: 30, rays: 31, spectrum: 'white' },
  beam: { kind: 'beam', id: 0, x: 0, y: 0, angle: 0, width: 20, rays: 9, spectrum: 532 },
  object: {
    kind: 'object',
    id: 0,
    x: 0,
    y: 0,
    angle: 0,
    height: 20,
    cone: 40,
    rays: 9,
    spectrum: 589.3,
  },
  mirror: { kind: 'mirror', id: 0, x: 0, y: 0, angle: 45, length: 60 },
  arcMirror: {
    kind: 'arcMirror',
    id: 0,
    x: 0,
    y: 0,
    angle: 180,
    radius: 120,
    diameter: 60,
    form: 'concave',
  },
  lens: {
    kind: 'lens',
    id: 0,
    x: 0,
    y: 0,
    angle: 0,
    radius1: 60,
    radius2: 60,
    diameter: 40,
    material: 'bk7',
  },
  prism: { kind: 'prism', id: 0, x: 0, y: 0, angle: 0, side: 60, material: 'sf11' },
  ball: { kind: 'ball', id: 0, x: 0, y: 0, angle: 0, diameter: 30, material: 'bk7' },
  blocker: { kind: 'blocker', id: 0, x: 0, y: 0, angle: 90, length: 40 },
  detector: { kind: 'detector', id: 0, x: 0, y: 0, angle: 90, length: 50 },
  ruler: { kind: 'ruler', id: 0, x: 0, y: 0, angle: 0, length: 50 },
  eye: { kind: 'eye', id: 0, x: 0, y: 0, angle: 180, pupil: 8, fieldOfView: 70 },
} satisfies { [Kind in ObjectKind]: Extract<SceneObject, { kind: Kind }> };

const historyLimit = 100;
const duplicateOffset = 12;
// Clear space kept between a new object and its neighbours, in mm.
const placementGap = 10;
const placementTries = 200;

/** Rounds to 0.01 so scene links stay short and survive a round trip unchanged. */
function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampPosition(value: number): number {
  return Math.min(Math.max(value, fieldRanges.position.min), fieldRanges.position.max);
}

/** Rounds a placement and keeps it inside the scene's bounds, so a write never fails validation. */
function roundPlacement<T extends SceneObject>(object: T): T {
  return {
    ...object,
    x: clampPosition(roundToHundredths(object.x)),
    y: clampPosition(roundToHundredths(object.y)),
    angle: wrapAngle(roundToHundredths(object.angle)),
  };
}

/** The nearest grid line to `value`, rounded to 0.01 like every stored position. */
export function snapToGrid(value: number, size: number): number {
  return roundToHundredths(Math.round(value / size) * size);
}

function snapPoint(point: Point, grid: GridSettings): Point {
  if (!grid.snap) return point;
  return { x: snapToGrid(point.x, grid.size), y: snapToGrid(point.y, grid.size) };
}

function isClear(object: SceneObject, others: SceneObject[]): boolean {
  for (const other of others) {
    const needed = extentOf(object) + extentOf(other) + placementGap;
    if (Math.hypot(object.x - other.x, object.y - other.y) < needed) return false;
  }
  return true;
}

/**
 * `object` moved to the first clear spot found stepping right from `centre`, on the grid when
 * snapping is on; at `centre` when the bench is too crowded to find one.
 */
function placedClear(object: SceneObject, scene: Scene, centre: Point): SceneObject {
  const grid = scene.settings.grid;
  const step = grid.snap ? Math.max(grid.size, placementGap) : placementGap;
  for (let tries = 0; tries < placementTries; tries += 1) {
    const spot = snapPoint({ x: centre.x + tries * step, y: centre.y }, grid);
    const placed = { ...object, ...spot };
    if (isClear(placed, scene.objects)) return placed;
  }
  return { ...object, ...snapPoint(centre, grid) };
}

function nextObjectId(scene: Scene): number {
  let highest = 0;
  for (const object of scene.objects) highest = Math.max(highest, object.id);
  return highest + 1;
}

/** The eye whose view the app analyses: the selected eye, else the first eye, else none. */
export function analyzedEyeId(scene: Scene, selectedId: number | null): number | null {
  const selected = scene.objects.find((object) => object.id === selectedId);
  if (selected?.kind === 'eye') return selected.id;
  const firstEye = scene.objects.find((object) => object.kind === 'eye');
  return firstEye ? firstEye.id : null;
}

export function createStore(initialScene: Scene) {
  let state: AppState = {
    scene: initialScene,
    selectedId: null,
    view: { scale: 2, offsetX: 0, offsetY: 0 },
    eyeView: 'medium',
    results: null,
    traceCount: 0,
    linkError: null,
  };
  let past: Scene[] = [];
  let future: Scene[] = [];
  // True while a drag or slider keeps merging its changes into one history entry.
  let editOpen = false;
  const listeners = new Set<() => void>();

  function setState(changes: Partial<AppState>): void {
    state = { ...state, ...changes };
    for (const listener of listeners) listener();
  }

  function commitScene(scene: Scene, changes: Partial<AppState> = {}): void {
    past = [...past, state.scene].slice(-historyLimit);
    future = [];
    editOpen = false;
    setState({ ...changes, scene });
  }

  function replaceObjects(objects: SceneObject[]): Scene {
    return { ...state.scene, objects };
  }

  return {
    getState(): AppState {
      return state;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    replaceScene(scene: Scene): void {
      commitScene(scene, { selectedId: null });
    },

    addObject(kind: ObjectKind): void {
      if (state.scene.objects.length >= maxObjects) return;
      const id = nextObjectId(state.scene);
      const centre = { x: state.view.offsetX, y: state.view.offsetY };
      const object = roundPlacement(placedClear({ ...newObjects[kind], id }, state.scene, centre));
      commitScene(replaceObjects([...state.scene.objects, object]), { selectedId: id });
    },

    /** `continuesEdit` merges this change into the open history entry instead of starting one. */
    updateObject(
      id: number,
      patch: Partial<SceneObject>,
      options = { continuesEdit: false },
    ): void {
      const objects = state.scene.objects.map((object) => {
        if (object.id !== id) return object;
        // Throws on a field that belongs to another kind instead of storing an invalid object.
        const settled = roundPlacement({ ...object, ...patch, kind: object.kind });
        return parseSceneObject(settled);
      });
      if (options.continuesEdit && editOpen) {
        setState({ scene: replaceObjects(objects) });
        return;
      }
      commitScene(replaceObjects(objects));
      editOpen = options.continuesEdit;
    },

    finishEdit(): void {
      editOpen = false;
    },

    removeObject(id: number): void {
      const objects = state.scene.objects.filter((object) => object.id !== id);
      const selectedId = state.selectedId === id ? null : state.selectedId;
      commitScene(replaceObjects(objects), { selectedId });
    },

    clearScene(): void {
      commitScene(replaceObjects([]), { selectedId: null });
    },

    duplicateObject(id: number): void {
      const original = state.scene.objects.find((object) => object.id === id);
      if (!original) return;
      if (state.scene.objects.length >= maxObjects) return;
      const copyId = nextObjectId(state.scene);
      const beside = { x: original.x + duplicateOffset, y: original.y + duplicateOffset };
      const copy = roundPlacement({
        ...original,
        ...snapPoint(beside, state.scene.settings.grid),
        id: copyId,
      });
      commitScene(replaceObjects([...state.scene.objects, copy]), { selectedId: copyId });
    },

    select(id: number | null): void {
      setState({ selectedId: id });
    },

    setView(patch: Partial<View>): void {
      setState({ view: { ...state.view, ...patch } });
    },

    setEyeView(eyeView: EyeViewSize): void {
      setState({ eyeView });
    },

    setSettings(patch: Partial<Settings>): void {
      commitScene({ ...state.scene, settings: { ...state.scene.settings, ...patch } });
    },

    setResults(results: SceneResults): void {
      setState({ results, traceCount: state.traceCount + 1 });
    },

    setLinkError(message: string | null): void {
      setState({ linkError: message });
    },

    undo(): void {
      const previous = past.at(-1);
      if (!previous) return;
      past = past.slice(0, -1);
      future = [...future, state.scene];
      editOpen = false;
      setState({ scene: previous });
    },

    redo(): void {
      const next = future.at(-1);
      if (!next) return;
      future = future.slice(0, -1);
      past = [...past, state.scene];
      editOpen = false;
      setState({ scene: next });
    },

    canUndo(): boolean {
      return past.length > 0;
    },

    canRedo(): boolean {
      return future.length > 0;
    },
  };
}

export type Store = ReturnType<typeof createStore>;

export const store = createStore({ v: 2, settings: defaultSettings, objects: [] });

/** Subscribes a component to one slice of the app state; `select` must return stored values. */
export function useAppState<T>(select: (state: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.getState()));
}
