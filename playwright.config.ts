import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The tests run against their own database (pakto_e2e) and their own dev server on :3100,
// so they never touch the data behind http://localhost:3000. See e2e/README.md.
const PORT = 3100;

/** The app role's URL from .env.local, pointed at pakto_e2e. E2E_DATABASE_URL overrides it. */
function e2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const line = readFileSync(".env.local", "utf8").split("\n").find((row) => row.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL is missing in .env.local");
  return line.slice("DATABASE_URL=".length).trim().replace(/\/[^/]+$/, "/pakto_e2e");
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "bg-BG",
    trace: "off",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      DATABASE_URL: e2eDatabaseUrl(),
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
