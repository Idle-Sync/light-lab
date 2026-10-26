import { encodeSceneLink, type Scene } from '@light-lab/engine';
import { expect, type Page } from '@playwright/test';
import { benchToScreen, fitView } from '../src/bench/view';
import { kindTitles } from '../src/panels/inspector-fields';

/** The app URL that opens `scene` from a `#z.` link. */
export async function sceneUrl(scene: Scene): Promise<string> {
  return `/#${await encodeSceneLink(scene)}`;
}

/** What the bench's accessible description lists for each object of `scene`. */
export function describedObjects(scene: Scene): string[] {
  return scene.objects.map(
    (object) =>
      `${kindTitles[object.kind]} at x ${object.x} mm, y ${object.y} mm, angle ${object.angle}°`,
  );
}

export function benchArea(page: Page) {
  return page.getByRole('application', { name: 'Optical bench' });
}

export function inspector(page: Page) {
  return page.getByRole('complementary', { name: 'Inspector' });
}

/** The x of the selected object as the inspector shows it, in mm. */
export async function inspectorX(page: Page): Promise<number> {
  const text = await inspector(page)
    .getByText(/^x -?[\d.]+ mm, y/)
    .textContent();
  const match = /^x (-?[\d.]+) mm/.exec(text ?? '');
  if (!match) throw new Error(`no x in "${text}"`);
  return Number(match[1]);
}

/** Waits until the bench shows `scene`, read from the bench's accessible description. */
export async function expectSceneShown(page: Page, scene: Scene): Promise<void> {
  await expect(page.locator('#bench-description li')).toHaveText(describedObjects(scene));
}

/**
 * Fits the view with the Fit button, then returns the page point where a bench point is drawn.
 * The header can wrap after load and resize the canvas, so the view is fitted again first.
 */
export async function fitAndLocate(
  page: Page,
  scene: Scene,
  benchPoint: { x: number; y: number },
): Promise<{ x: number; y: number }> {
  await page.getByRole('button', { name: 'Fit' }).click();
  const box = await benchArea(page).boundingBox();
  if (!box) throw new Error('the bench is not on screen');
  const size = { width: box.width, height: box.height };
  const screen = benchToScreen(benchPoint, fitView(scene.objects, size), size);
  return { x: box.x + screen.x, y: box.y + screen.y };
}

/** Clicks the object with `id` in `scene`, which must be on screen, to select it. */
export async function selectObject(page: Page, scene: Scene, id: number): Promise<void> {
  const object = scene.objects.find((candidate) => candidate.id === id);
  if (!object) throw new Error(`no object ${id} in the scene`);
  const point = await fitAndLocate(page, scene, object);
  await page.mouse.click(point.x, point.y);
}
