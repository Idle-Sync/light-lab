import { encodeSceneLink, examples, type Scene } from '@light-lab/engine';
import type { Page } from '@playwright/test';
import { describedObjects, expectSceneShown, inspector, sceneUrl, selectObject } from './bench';
import { expect, test } from './test';

const headerExamples: Array<[string, Scene]> = [
  ['Glass ball and eye', examples.ball],
  ['Magnifying glass', examples.magnifier],
  ['Optics bench', examples.bench],
];

function headerStatus(page: Page) {
  return page.getByRole('banner').getByRole('status');
}

test('each header example opens from its link in a running tab and clears the hash', async ({
  page,
}) => {
  await page.goto('/');
  const examplesNav = page.getByRole('navigation', { name: 'Examples' });
  for (const [name, scene] of headerExamples) {
    await examplesNav.getByRole('link', { name }).click();
    await expectSceneShown(page, scene);
    expect(await page.evaluate(() => location.hash)).toBe('');
  }
});

test('the bench lens reads as a converging lens of the thick-lens focal length', async ({
  page,
}) => {
  await page.goto(await sceneUrl(examples.bench));
  await expectSceneShown(page, examples.bench);
  await selectObject(page, examples.bench, 2);
  await expect(inspector(page)).toContainText('converging, f = +50.1 mm');
});

test('two overlapping balls warn that inside and outside are undefined', async ({ page }) => {
  const overlapping: Scene = {
    v: 1,
    settings: examples.ball.settings,
    objects: [
      { kind: 'ball', id: 1, x: 0, y: 0, angle: 0, diameter: 30, material: 'bk7' },
      { kind: 'ball', id: 2, x: 10, y: 0, angle: 0, diameter: 30, material: 'bk7' },
    ],
  };
  await page.goto(`/#${await encodeSceneLink(overlapping)}`);
  await expectSceneShown(page, overlapping);
  await selectObject(page, overlapping, 2);
  await expect(inspector(page)).toContainText('Overlaps ball: inside or outside is undefined');
});

test('Share says "Link copied" for two seconds after the last click', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const status = headerStatus(page);
  await expect(status).toHaveCount(1);
  await expect(status).toHaveText('');

  const share = page.getByRole('button', { name: 'Share' });
  await share.click();
  await expect(status).toHaveText('Link copied');
  await page.clock.runFor(1000);
  await share.click();
  await expect(status).toHaveText('Link copied');
  // 2.5 s after the first click: the first timer would have cleared the message by now.
  await page.clock.runFor(1500);
  expect(await status.textContent()).toBe('Link copied');
  await page.clock.runFor(1000);
  await expect(status).toHaveText('');
});

test('the copied link opens the same scene in a new page', async ({ page, context }) => {
  await page.goto(await sceneUrl(examples.magnifier));
  await expectSceneShown(page, examples.magnifier);
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(headerStatus(page)).toHaveText('Link copied');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#z.');

  const second = await context.newPage();
  await second.goto(link);
  await expectSceneShown(second, examples.magnifier);
});

test('a link that is not a scene is reported and leaves the scene alone', async ({ page }) => {
  await page.goto('/');
  await expectSceneShown(page, examples.bench);
  await page.evaluate(() => {
    location.hash = 'z.garbage';
  });
  await expect(page.getByRole('banner').getByRole('alert')).toContainText(
    'This link is not a Light Lab scene',
  );
  await expectSceneShown(page, examples.bench);
  expect(await page.evaluate(() => location.hash)).toBe('');
});

test('a reload reopens the scene that was on screen', async ({ page }) => {
  await page.goto(await sceneUrl(examples.ball));
  await expectSceneShown(page, examples.ball);
  await page.reload();
  await expect(page.locator('#bench-description li')).toHaveText(describedObjects(examples.ball));
});
