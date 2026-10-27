import AxeBuilder from '@axe-core/playwright';
import { examples, type Scene } from '@light-lab/engine';
import { kindTitles } from '../src/panels/inspector-fields';
import { expectSceneShown, sceneUrl, selectObject } from './bench';
import { expect, test } from './test';

// Each example with an object selected, so the inspector shows its fields and readouts.
const selections: Array<[string, Scene, number]> = [
  ['bench with the lens selected', examples.bench, 2],
  ['bench with the detector selected', examples.bench, 3],
  ['ball with the eye selected', examples.ball, 3],
  ['magnifier with the eye selected', examples.magnifier, 3],
];

function severeViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string[] {
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`,
    );
}

for (const [name, scene, id] of selections) {
  test(`no serious or critical WCAG A or AA violation: ${name}`, async ({ page }) => {
    await page.goto(await sceneUrl(scene));
    await expectSceneShown(page, scene);
    await selectObject(page, scene, id);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const severe = severeViolations(results.violations);
    expect(severe).toEqual([]);
  });
}

test('no serious or critical WCAG violation with a toolbar tooltip shown', async ({ page }) => {
  await page.goto(await sceneUrl(examples.bench));
  await expectSceneShown(page, examples.bench);
  await page.getByRole('button', { name: 'Add lens' }).focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(severeViolations(results.violations)).toEqual([]);
});

test('the guide dialog lists every tool, passes axe and gives focus back', async ({ page }) => {
  await page.goto(await sceneUrl(examples.bench));
  await expectSceneShown(page, examples.bench);
  const guideButton = page.getByRole('button', { name: 'Guide', exact: true });
  await guideButton.click();
  const dialog = page.getByRole('dialog', { name: 'Guide' });
  await expect(dialog).toBeVisible();
  for (const title of Object.values(kindTitles)) {
    await expect(dialog.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(severeViolations(results.violations)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(guideButton).toBeFocused();
});
