import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests on the two viewports that matter (Part E): a desktop browser and a Pixel 7, because most
 * customers are on a phone.
 *
 * The suite expects the stack to be running — `pnpm db:local`, `pnpm seed`, `pnpm dev` — and reuses it. If
 * nothing is listening on :3000, Playwright starts the storefront itself; the API still has to be up.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    // The two that run as tests. They ignore the capture spec, which is not a test.
    {
      name: "desktop",
      testIgnore: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    { name: "mobile", testIgnore: /screenshots\.spec\.ts/, use: { ...devices["Pixel 7"] } },

    /**
     * `pnpm screenshots` — photographs the running app for the pitch pack. It is a project rather than an
     * environment variable so the same command works on Windows and POSIX, and it sets its own viewports.
     */
    {
      name: "capture",
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
