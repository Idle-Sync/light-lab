import { type BrowserContext, test as base, expect } from '@playwright/test';

/**
 * Collects every console error and warning and every uncaught error from every page of
 * `context`, including pages opened later. The returned array fills as events arrive.
 */
export function recordConsoleProblems(context: BrowserContext): string[] {
  const problems: string[] = [];
  context.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  context.on('weberror', (webError) => problems.push(`uncaught: ${webError.error().message}`));
  return problems;
}

/**
 * Playwright's `test` with one automatic check: a spec fails when any page logs a console
 * error or warning or throws, so runtime errors never pass silently.
 */
export const test = base.extend<{ consoleGate: undefined }>({
  consoleGate: [
    async ({ context }, use) => {
      const problems = recordConsoleProblems(context);
      await use(undefined);
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
