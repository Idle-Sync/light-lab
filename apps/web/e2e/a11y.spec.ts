import AxeBuilder from '@axe-core/playwright';
import { examples, type Scene } from '@light-lab/engine';
import { expectSceneShown, sceneUrl, selectObject } from './bench';
import { expect, test } from './test';

// Each example with an object selected, so the inspector shows its fields and readouts.
const selections: Array<[string, Scene, number]> = [
  ['bench with the lens selected', examples.bench, 2],
  ['ball with the eye selected', examples.ball, 3],
  ['magnifier with the eye selected', examples.magnifier, 3],
];

for (const [name, scene, id] of selections) {
  test(`no serious or critical WCAG A or AA violation: ${name}`, async ({ page }) => {
    await page.goto(await sceneUrl(scene));
    await expectSceneShown(page, scene);
    await selectObject(page, scene, id);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const severe = results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`,
      );
    expect(severe).toEqual([]);
  });
}
