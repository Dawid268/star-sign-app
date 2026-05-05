import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const e2ePort = process.env['E2E_PORT'] || '4300';
const baseURL = process.env['BASE_URL'] || `http://localhost:${e2ePort}`;
const useFullBrowserMatrix = process.env['E2E_FULL_MATRIX'] === 'true';
const workers = Number(process.env['E2E_WORKERS'] || '1');
const e2eServerEnv = `E2E_MOCK_API=true GA4_MEASUREMENT_ID=G-E2ETEST NG_ALLOWED_HOSTS=localhost,localhost:${e2ePort},127.0.0.1,127.0.0.1:${e2ePort} FRONTEND_URL=${baseURL} PORT=${e2ePort}`;
const webServer =
  process.env['BASE_URL'] === undefined
    ? {
        command: `${e2eServerEnv} npm exec -- nx run frontend:build:production --outputStyle=static && ${e2eServerEnv} node dist/frontend/server/server.mjs`,
        url: baseURL,
        reuseExistingServer: process.env['E2E_REUSE_SERVER'] === 'true',
        timeout: 300 * 1000,
        cwd: workspaceRoot,
      }
    : undefined;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  workers,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    serviceWorkers: 'block',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run your local dev server before starting the tests */
  webServer,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(useFullBrowserMatrix
      ? [
          {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
          },
          {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
          },
        ]
      : []),

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
