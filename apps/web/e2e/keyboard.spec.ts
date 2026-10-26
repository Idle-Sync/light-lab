import type { Locator, Page } from '@playwright/test';
import { benchArea, inspector, inspectorX } from './bench';
import { expect, test } from './test';

const toolbarNames = [
  'Add point source',
  'Add collimated beam',
  'Add object',
  'Add flat mirror',
  'Add curved mirror',
  'Add lens',
  'Add prism',
  'Add ball lens',
  'Add blocker',
  'Add detector',
  'Add ruler',
  'Add eye',
];

/** Presses Tab until `target` has focus; fails after `limit` presses. */
async function tabTo(page: Page, target: Locator, limit = 60): Promise<void> {
  for (let press = 0; press < limit; press += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${target}`);
}

test('the bench can be built and edited from the keyboard alone', async ({ page }) => {
  await page.goto('/');
  const toolbar = page.getByRole('toolbar', { name: 'Add to bench' });

  await tabTo(page, toolbar.getByRole('button', { name: toolbarNames[0], exact: true }));
  for (const name of toolbarNames) {
    await expect(toolbar.getByRole('button', { name, exact: true })).toBeFocused();
    if (name !== toolbarNames.at(-1)) await page.keyboard.press('Tab');
  }
  for (let press = 0; press < 6; press += 1) await page.keyboard.press('Shift+Tab');
  await expect(toolbar.getByRole('button', { name: 'Add lens' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(inspector(page).getByRole('heading', { name: 'Thick lens' })).toBeVisible();

  const diameter = inspector(page).getByLabel('Diameter');
  const diameterText = inspector(page).locator('output[for$="-diameter"]');
  await tabTo(page, diameter);
  await page.keyboard.press('ArrowRight');
  await expect(diameterText).toHaveText('41 mm');
  await page.keyboard.press('Control+z');
  await expect(diameterText).toHaveText('40 mm');

  const slider = await diameter.boundingBox();
  if (!slider) throw new Error('the diameter slider is not on screen');
  // Diameter runs 4 to 120 mm across the track, so 40 mm sits 31 % of the way along.
  const thumbX = slider.x + slider.width * ((40 - 4) / (120 - 4));
  const middleY = slider.y + slider.height / 2;
  await page.mouse.move(thumbX, middleY);
  await page.mouse.down();
  for (let step = 1; step <= 5; step += 1) await page.mouse.move(thumbX + step * 6, middleY);
  await page.mouse.up();
  await expect(diameterText).not.toHaveText('40 mm');
  await page.keyboard.press('Control+z');
  await expect(diameterText).toHaveText('40 mm');

  const xBefore = await inspectorX(page);
  await benchArea(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => inspectorX(page)).toBe(xBefore + 1);
  await page.keyboard.press('Control+z');
  await expect.poll(() => inspectorX(page)).toBe(xBefore);

  const redo = page.getByRole('button', { name: 'Redo' });
  await expect(redo).toBeEnabled();
  const material = inspector(page).getByRole('button', { name: 'N-BK7' });
  await expect(material).toHaveAttribute('aria-pressed', 'true');
  await material.click();
  await expect(redo).toBeEnabled();
});
