import { defineConfig } from "@playwright/test";

// Uses your installed Google Chrome (no browser download needed). Run against a fresh DB:
//   rm -rf .data && npm run setup && npm run build && npm start   (in another terminal)
//   npm run test:e2e
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    channel: process.env.PW_CHROME_PATH ? undefined : "chrome",
    launchOptions: process.env.PW_CHROME_PATH ? { executablePath: process.env.PW_CHROME_PATH } : undefined,
    viewport: { width: 1440, height: 900 },
  },
});
