import { defineConfig } from "@playwright/test";

/**
 * Playwright config for e2e flows (task 7.10). The webServer boots the Vite
 * app; e2e tests live in test/e2e.
 */
export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
