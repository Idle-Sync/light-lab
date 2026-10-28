import { expect, recordConsoleProblems, test } from './test';

test('the console gate collects an error, a warning and an uncaught error from a page of its own', async ({
  browser,
}) => {
  const page = await browser.newPage();
  try {
    const problems = recordConsoleProblems(page.context());
    await page.goto('about:blank');
    await page.evaluate(() => {
      console.error('e');
      console.warn('w');
      setTimeout(() => {
        throw new Error('u');
      });
    });
    await expect
      .poll(() => [...problems].sort())
      .toEqual(['error: e', 'uncaught: u', 'warning: w']);
  } finally {
    await page.close();
  }
});

test('the console gate collects nothing from a page that logs nothing', async ({ browser }) => {
  const page = await browser.newPage();
  try {
    const problems = recordConsoleProblems(page.context());
    await page.goto('about:blank');
    await page.evaluate(() => console.log('fine'));
    expect(problems).toEqual([]);
  } finally {
    await page.close();
  }
});
