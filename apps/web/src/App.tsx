import { useEffect } from 'react';
import { BenchCanvas } from './bench/BenchCanvas';
import { StatusPill } from './bench/StatusPill';
import { ZoomControls } from './bench/ZoomControls';
import { TooltipProvider } from './components/ui/tooltip';
import { createEngineClient, startEngineWorker } from './engine-client';
import { BenchDescription } from './panels/BenchDescription';
import { Header } from './panels/Header';
import { Inspector } from './panels/Inspector';
import { Toolbar } from './panels/Toolbar';
import { analyzedEyeId, store, useAppState } from './store';

const engineClient = createEngineClient(startEngineWorker());

export function App() {
  const scene = useAppState((state) => state.scene);
  const selectedId = useAppState((state) => state.selectedId);
  const eyeId = analyzedEyeId(scene, selectedId);

  useEffect(() => engineClient.subscribe((results) => store.setResults(results)), []);

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
