import { test, expect } from "@playwright/test"

const REQUIRES_CREDS = !process.env.PLAYWRIGHT_SUPERADMIN_EMAIL || !process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD
const SKIP_MSG = "Set PLAYWRIGHT_SUPERADMIN_EMAIL and PLAYWRIGHT_SUPERADMIN_PASSWORD to run this test."

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_SUPERADMIN_EMAIL!)
  await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD!)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL("**/dashboard", { timeout: 15000 })
}

test("dashboard shows KPI stat cards after login", async ({ page }) => {
  test.skip(REQUIRES_CREDS, SKIP_MSG)
  await login(page)

  await expect(page.getByText(/total requests/i)).toBeVisible()
  await expect(page.getByText(/active requests/i)).toBeVisible()
  await expect(page.getByText(/completed/i)).toBeVisible()
})

test("dashboard navigation links work", async ({ page }) => {
  test.skip(REQUIRES_CREDS, SKIP_MSG)
  await login(page)

  await page.getByRole("link", { name: /all requests/i }).click()
  await expect(page).toHaveURL(/all-requests/)

  await page.getByRole("link", { name: /analytics/i }).click()
  await expect(page).toHaveURL(/analytics/)
})

test("API /api/health returns healthy status", async ({ request }) => {
  const res = await request.get("/api/health")
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.ok).toBe(true)
})

test("API routes return 401 without auth", async ({ request }) => {
  const protectedRoutes = [
    "/api/users",
    "/api/notifications",
    "/api/roles",
  ]

  for (const route of protectedRoutes) {
    const res = await request.get(route)
    expect(res.status(), `Expected 401 for ${route}`).toBe(401)
  }
})

test("x-user-role header bypass is no longer possible", async ({ request }) => {
  const res = await request.get("/api/users", {
    headers: { "x-user-role": "super_admin" },
  })
  expect(res.status()).toBe(401)
})
