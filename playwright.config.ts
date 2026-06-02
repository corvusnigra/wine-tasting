import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config — drives the real app against the LOCAL Supabase stack
 * (ports +100, see supabase/config.toml). Run `supabase start` and
 * `pnpm seed` first, then `pnpm test:e2e`.
 *
 * A dedicated port (3100) keeps the e2e dev server clear of a hand-run
 * `pnpm dev` on :3000.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: "ru-RU",
    // Mobile-first app — exercise the phone layout friends actually use.
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
