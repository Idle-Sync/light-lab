import type { Scene } from '@light-lab/engine';
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
import {
  createLinkOpener,
  isSceneLink,
  keepLastScene,
  lastSavedScene,
  storageOrNull,
} from './startup';
import { analyzedEyeId, store, useAppState } from './store';

const engineClient = createEngineClient(startEngineWorker());

/** Replaces the scene and fits the view to it; before the canvas has a size, its setup fits instead. */
function openScene(scene: Scene): void {
  store.replaceScene(scene);
  const { width, height } = getCanvasStatus();
  if (width > 0) store.setView(fitView(scene.objects, { width, height }));
}

const openLink = createLinkOpener(store, openScene);

/**
 * Opens the scene link in the URL fragment. The fragment is cleared either way, so a reload
 * reopens the last saved scene, edits included, rather than the link.
 */
function openLinkInHash(): void {
  const hash = location.hash;
  if (!isSceneLink(hash)) return;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  void openLink(hash);
}

// Runs once per page load, outside React, so StrictMode's double effects cannot open a scene
// twice. The saved scene opens first, so a broken link leaves it on screen and in storage.
const storage = storageOrNull(() => window.localStorage);
keepLastScene(store, storage);
const lastScene = lastSavedScene(storage);
if (lastScene) openScene(lastScene);
openLinkInHash();

export function App() {
  const scene = useAppState((state) => state.scene);
  const selectedId = useAppState((state) => state.selectedId);
  const eyeId = analyzedEyeId(scene, selectedId);

  useEffect(() => engineClient.subscribe((results) => store.setResults(results)), []);

  useEffect(() => bindShortcuts(store), []);

  useEffect(() => {
    window.addEventListener('hashchange', openLinkInHash);
    return () => window.removeEventListener('hashchange', openLinkInHash);
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
