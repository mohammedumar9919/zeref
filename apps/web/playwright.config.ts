import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3099";

/** Ensures Playwright-started `next start` always has BFF fixture + mocks (ZR-001). */
const webServerEnv: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] != null),
  ),
  PORT,
  ZEREF_BFF_FIXTURE: process.env.ZEREF_BFF_FIXTURE ?? "1",
  ZEREF_JOB_ENQUEUE_MOCK: process.env.ZEREF_JOB_ENQUEUE_MOCK ?? "1",
  ZEREF_LLM_MOCK: process.env.ZEREF_LLM_MOCK ?? "1",
  ZEREF_TTS_MOCK: process.env.ZEREF_TTS_MOCK ?? "1",
  ZEREF_WHISPER_MOCK: process.env.ZEREF_WHISPER_MOCK ?? "1",
  ZEREF_MEMORY_MOCK: process.env.ZEREF_MEMORY_MOCK ?? "1",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: `http://127.0.0.1:${PORT}/cockpit`,
    /** Only reuse when explicitly opted in after a verify-started server (see verify-phase-5.mjs). */
    reuseExistingServer: process.env.ZEREF_PLAYWRIGHT_REUSE === "1",
    cwd: ".",
    timeout: 120_000,
    env: webServerEnv,
  },
});
