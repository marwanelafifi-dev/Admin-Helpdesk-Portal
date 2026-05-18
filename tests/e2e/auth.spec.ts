import { test, expect } from "@playwright/test"

const REQUIRES_CREDS = !process.env.PLAYWRIGHT_SUPERADMIN_EMAIL || !process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD
const SKIP_MSG = "Set PLAYWRIGHT_SUPERADMIN_EMAIL and PLAYWRIGHT_SUPERADMIN_PASSWORD to run this test."

test("login page loads and shows sign-in form", async ({ page }) => {
  await page.goto("/login")
  await expect(page).toHaveTitle(/sign in|login|admin request/i)
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
})

test("unauthenticated user is redirected to login from dashboard", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/login|signin/)
})

test("unauthenticated user is redirected from protected routes", async ({ page }) => {
  for (const route of ["/admin/all-requests", "/analytics", "/hr"]) {
    await page.goto(route)
    await expect(page).toHaveURL(/login|signin/)
  }
})

test("successful credential login redirects to dashboard", async ({ page }) => {
  test.skip(REQUIRES_CREDS, SKIP_MSG)

  await page.goto("/login")
  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_SUPERADMIN_EMAIL!)
  await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD!)
  await page.getByRole("button", { name: /sign in/i }).click()

  await page.waitForURL("**/dashboard", { timeout: 15000 })
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible()
})

test("incorrect password shows error message", async ({ page }) => {
  test.skip(REQUIRES_CREDS, SKIP_MSG)

  await page.goto("/login")
  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_SUPERADMIN_EMAIL!)
  await page.getByLabel(/password/i).fill("wrong-password-123!")
  await page.getByRole("button", { name: /sign in/i }).click()

  await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 })
})
