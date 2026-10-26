import { examples } from '@light-lab/engine';
import type { CDPSession } from '@playwright/test';
import {
  benchArea,
  expectSceneShown,
  fitAndLocate,
  inspector,
  inspectorX,
  sceneUrl,
} from './bench';
import { expect, test } from './test';

type TouchPoint = { x: number; y: number; id: number };

async function touch(
  session: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  touchPoints: TouchPoint[],
): Promise<void> {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints });
}

test('one finger drags an object and two fingers pinch-zoom the bench', async ({ page }) => {
  await page.goto(await sceneUrl(examples.ball));
  await expectSceneShown(page, examples.ball);
  const session = await page.context().newCDPSession(page);

  const ball = await fitAndLocate(page, examples.ball, { x: 0, y: 0 });
  await touch(session, 'touchStart', [{ ...ball, id: 1 }]);
  for (let step = 1; step <= 5; step += 1) {
    await touch(session, 'touchMove', [{ x: ball.x + step * 6, y: ball.y, id: 1 }]);
  }
  await touch(session, 'touchEnd', []);
  await expect(inspector(page).getByRole('heading', { name: 'Ball lens' })).toBeVisible();
  expect(await inspectorX(page)).toBeGreaterThan(0);

  // Deselect with a tap on empty bench, so the scale bar is the only "<n> mm" text on screen.
  const box = await benchArea(page).boundingBox();
  if (!box) throw new Error('the bench is not on screen');
  const middle = { x: box.x + box.width / 2, y: box.y + 24 };
  await touch(session, 'touchStart', [{ ...middle, id: 1 }]);
  await touch(session, 'touchEnd', []);
  const scaleBar = page.getByText(/^[\d.]+ mm$/);
  const scaleBefore = await scaleBar.textContent();

  await touch(session, 'touchStart', [
    { x: middle.x - 30, y: middle.y, id: 1 },
    { x: middle.x + 30, y: middle.y, id: 2 },
  ]);
  for (let step = 1; step <= 5; step += 1) {
    await touch(session, 'touchMove', [
      { x: middle.x - 30 - step * 20, y: middle.y, id: 1 },
      { x: middle.x + 30 + step * 20, y: middle.y, id: 2 },
    ]);
  }
  await touch(session, 'touchEnd', []);
  await expect(scaleBar).not.toHaveText(scaleBefore ?? '');
});
