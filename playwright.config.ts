import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: 'apps/web/e2e',
  outputDir: 'apps/web/test-results',
  // One worker: the performance budgets need the machine to themselves.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // `list` beside `github`: the CI log then shows every test's duration and printed lines on a pass.
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: 'touch.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'pixel-7',
      testMatch: 'touch.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // The production build, as users get it: the performance budgets assume it.
  webServer: {
    command: `pnpm --filter web build && pnpm --filter web preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
