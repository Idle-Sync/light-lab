import { test as base, expect } from '@playwright/test';

/**
 * Playwright's `test` with one automatic check: a spec fails when the page logs a console
 * error or warning or throws, so runtime errors never pass silently.
 */
export const test = base.extend<{ consoleGate: undefined }>({
  consoleGate: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          problems.push(`${message.type()}: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
      await use(undefined);
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
