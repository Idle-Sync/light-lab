import p5 from 'p5';
import { type KeyboardEvent, useEffect, useRef } from 'react';
import { store } from '../store';
import { setCanvasStatus } from './canvas-status';
import { drawBench } from './draw';
import { createGestures } from './gestures';
import { keyToSceneEdit } from './keyboard';
import { fitView } from './view';

function context2dOf(sketch: p5): CanvasRenderingContext2D {
  const context = sketch.drawingContext;
  if (!(context instanceof CanvasRenderingContext2D)) {
    throw new Error('The bench canvas needs a 2D context; p5 created a WebGL one');
  }
  return context;
}

/** Moves or turns the selected object with the arrow and bracket keys, one history entry per press. */
function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
  const { scene, selectedId } = store.getState();
  const selected = scene.objects.find((object) => object.id === selectedId);
  if (!selected) return;
  const edit = keyToSceneEdit(event.key, event.shiftKey, selected);
  if (!edit) return;
  event.preventDefault();
  store.updateObject(selected.id, edit);
}

/**
 * The optical bench: one p5 instance that sizes the canvas and redraws it from the store
 * whenever the scene, view or results change. Input comes from Pointer Events on the wrapper.
 */
export function BenchCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resizeObserver: ResizeObserver | null = null;
    let unmounted = false;
    const instance = new p5((sketch: p5) => {
      sketch.setup = () => {
        // p5 runs setup asynchronously, so an unmount (React StrictMode's first pass) can come
        // first; removing the instance then would leave the canvas setup creates behind.
        if (unmounted) {
          sketch.remove();
          return;
        }
        const size = { width: container.clientWidth, height: container.clientHeight };
        sketch.createCanvas(size.width, size.height);
        sketch.noLoop();
        setCanvasStatus(size);
        store.setView(fitView(store.getState().scene.objects, size));
        resizeObserver = new ResizeObserver(() => {
          sketch.resizeCanvas(container.clientWidth, container.clientHeight);
          setCanvasStatus({ width: container.clientWidth, height: container.clientHeight });
        });
        resizeObserver.observe(container);
      };
      sketch.draw = () => {
        const start = performance.now();
        const { scene, selectedId, view, results } = store.getState();
        drawBench(context2dOf(sketch), {
          scene,
          selectedId,
          view,
          results,
          size: { width: sketch.width, height: sketch.height },
        });
        setCanvasStatus({ frameMs: performance.now() - start });
      };
    }, container);
    const unsubscribe = store.subscribe(() => {
      void instance.redraw();
    });

    const gestures = createGestures(store, () => container.getBoundingClientRect());
    function onPointerDown(event: PointerEvent): void {
      container?.setPointerCapture(event.pointerId);
      gestures.pointerDown(event);
    }
    function onWheel(event: WheelEvent): void {
      // Stops the page from scrolling or the browser from zooming on a trackpad pinch.
      event.preventDefault();
      gestures.wheel(event);
    }
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', gestures.pointerMove);
    container.addEventListener('pointerup', gestures.pointerUp);
    container.addEventListener('pointercancel', gestures.pointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', gestures.pointerMove);
      container.removeEventListener('pointerup', gestures.pointerUp);
      container.removeEventListener('pointercancel', gestures.pointerUp);
      container.removeEventListener('wheel', onWheel);
      unsubscribe();
      resizeObserver?.disconnect();
      unmounted = true;
      instance.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-roledescription="optical bench"
      aria-label="Optical bench"
      aria-describedby="bench-description"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the bench takes arrow and bracket keys for the selected object, so it must be focusable
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 overflow-hidden bg-darkroom outline-none focus-visible:ring-2 focus-visible:ring-sodium focus-visible:ring-inset"
      style={{ touchAction: 'none' }}
    />
  );
}
