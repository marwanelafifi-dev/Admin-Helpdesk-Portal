import { test, expect } from "@playwright/test"

test("super admin can log in and toggle maintenance mode", async ({ page }) => {
  test.skip(
    !process.env.PLAYWRIGHT_SUPERADMIN_EMAIL || !process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD,
    "Set PLAYWRIGHT_SUPERADMIN_EMAIL and PLAYWRIGHT_SUPERADMIN_PASSWORD to run this test."
  )

  await page.goto("/login")

  await page.getByLabel("Email").fill(process.env.PLAYWRIGHT_SUPERADMIN_EMAIL!)
  await page.getByLabel("Password").fill(process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD!)
  await page.getByRole("button", { name: "Sign in" }).click()

  await page.waitForURL("**/dashboard")
  await page.goto("/admin/settings")

  const toggleButton = page.getByRole("button", { name: /Maintenance Mode|Disable Maintenance Mode|Enable Maintenance Mode/i })
  await expect(toggleButton).toBeVisible()

  const statusText = page.getByText(/Current status:/i)
  const before = await statusText.textContent()

  await toggleButton.click()
  await expect(statusText).not.toHaveText(before ?? "")

  await toggleButton.click()
})
