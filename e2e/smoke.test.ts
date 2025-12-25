import { test, expect } from '@playwright/test'

test('app loads successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
})
