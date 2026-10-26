import { decodeSceneLink, type Scene, SceneError } from '@light-lab/engine';
import { useEffect } from 'react';
import { BenchCanvas } from './bench/BenchCanvas';
import { getCanvasStatus } from './bench/canvas-status';
import { StatusPill } from './bench/StatusPill';
import { fitView } from './bench/view';
import { ZoomControls } from './bench/ZoomControls';
import { TooltipProvider } from './components/ui/tooltip';
import { createEngineClient, startEngineWorker } from './engine-client';
import { BenchDescription } from './panels/BenchDescription';
import { Header } from './panels/Header';
import { Inspector } from './panels/Inspector';
import { Toolbar } from './panels/Toolbar';
import { bindShortcuts } from './shortcuts';
import { loadLastScene, saveLastScene } from './storage';
import { analyzedEyeId, store, useAppState } from './store';

const engineClient = createEngineClient(startEngineWorker());

function isSceneLink(hash: string): boolean {
  return hash.startsWith('#z.') || hash.startsWith('#j.');
}

/** Replaces the scene and fits the view to it; before the canvas has a size, its setup fits instead. */
function openScene(scene: Scene): void {
  store.replaceScene(scene);
  const { width, height } = getCanvasStatus();
  if (width > 0) store.setView(fitView(scene.objects, { width, height }));
}

/**
 * Opens the scene link in the URL fragment. The fragment is cleared either way, so a reload
 * reopens the last saved scene, edits included, rather than the link.
 */
async function openLinkInHash(): Promise<void> {
  const hash = location.hash;
  if (!isSceneLink(hash)) return;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  try {
    openScene(await decodeSceneLink(hash));
    store.setLinkError(null);
  } catch (error) {
    if (!(error instanceof SceneError)) throw error;
    store.setLinkError(`This link is not a Light Lab scene: ${error.message}`);
  }
}

/** Saves every new scene for the next visit and clears a link error once the scene changes. */
function keepLastScene(): void {
  let savedScene = store.getState().scene;
  store.subscribe(() => {
    const { scene, linkError } = store.getState();
    if (scene === savedScene) return;
    savedScene = scene;
    saveLastScene(localStorage, scene);
    if (linkError !== null) store.setLinkError(null);
  });
}

// Runs once per page load, outside React, so StrictMode's double effects cannot open a scene twice.
keepLastScene();
if (isSceneLink(location.hash)) {
  void openLinkInHash();
} else {
  const lastScene = loadLastScene(localStorage);
  if (lastScene) openScene(lastScene);
}

export function App() {
  const scene = useAppState((state) => state.scene);
  const selectedId = useAppState((state) => state.selectedId);
  const eyeId = analyzedEyeId(scene, selectedId);

  useEffect(() => engineClient.subscribe((results) => store.setResults(results)), []);

  useEffect(() => bindShortcuts(store), []);

  useEffect(() => {
    function onHashChange(): void {
      void openLinkInHash();
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Only scene and eye changes reach the worker; view changes redraw without retracing.
  useEffect(() => {
    engineClient.request(scene, eyeId);
  }, [scene, eyeId]);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-darkroom text-chalk">
        <Header />
        <main className="relative min-h-0 flex-1">
          <BenchCanvas />
          <BenchDescription />
          <Toolbar />
          <Inspector />
          <ZoomControls />
          <StatusPill />
        </main>
      </div>
    </TooltipProvider>
  );
}
