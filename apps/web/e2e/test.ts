import { test as base, expect } from '@playwright/test';

/**
 * Playwright's `test` with one automatic check: a spec fails when any page logs a console
 * error or warning or throws, so runtime errors never pass silently.
 */
export const test = base.extend<{ consoleGate: undefined }>({
  consoleGate: [
    async ({ context }, use) => {
      // On the context, so pages a spec opens itself are watched too.
      const problems: string[] = [];
      context.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          problems.push(`${message.type()}: ${message.text()}`);
        }
      });
      context.on('weberror', (webError) => problems.push(`uncaught: ${webError.error().message}`));
      await use(undefined);
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
