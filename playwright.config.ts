import { defineConfig } from "@playwright/test"

const port = Number(process.env.PORT || 3003)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: String(port),
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_NEXTAUTH_URL: baseURL,
      MAINTENANCE_MODE: process.env.MAINTENANCE_MODE || "false",
    },
  },
})
