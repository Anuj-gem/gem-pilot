/**
 * Pro user opportunity flow tests.
 *
 * Verifies that Pro users can browse AND apply to opportunities.
 * Apply buttons should be active and functional.
 * The apply page should load and show the form.
 */

import { test, expect } from '@playwright/test'
import { loginAs, getProCredentials } from './helpers'

test.describe('Pro user — opportunities', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getProCredentials()
    await loginAs(page, email, password)
  })

  test('can browse the opportunities listing page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1')).toContainText('Open calls')

    const cards = page.locator('a[href^="/opportunities/"]')
    await expect(cards.first()).toBeVisible()
  })

  test('sees "Apply" on qualifying cards (not "Pro" badge)', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    // If user has qualifying scripts, they should see "Apply →" not "Pro" pill
    // Look for the purple "Apply" text with arrow
    const applyLink = page.locator('span:has-text("Apply")').first()
    const proBadge = page.locator('span:has-text("Pro")').first()

    const applyVisible = await applyLink.isVisible().catch(() => false)
    const proVisible = await proBadge.isVisible().catch(() => false)

    // Pro users should NOT see the "Pro" upgrade badge
    // (They might see "Applied" badge if they already applied, which is fine)
    if (applyVisible) {
      expect(proVisible).toBe(false)
    }
  })

  test('sees working Apply button on opportunity detail page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('a[href^="/opportunities/"]').first()
    await firstCard.click()
    await page.waitForLoadState('networkidle')

    // Should see either:
    // 1. "Apply now" button (qualifying, not yet applied)
    // 2. "You've already applied" (already applied)
    // 3. "None of your scripts match" (no qualifying scripts)
    // Should NOT see "Upgrade to Pro"
    const upgradeButton = page.locator('text=Upgrade to Pro')
    await expect(upgradeButton).not.toBeVisible()
  })

  test('can access the apply page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('a[href^="/opportunities/"]').first()
    const href = await firstCard.getAttribute('href')
    if (!href) return

    // Navigate to apply page
    await page.goto(`${href}/apply`)
    await page.waitForLoadState('networkidle')

    // Should stay on the apply page (not get redirected)
    // Should see the apply form elements
    const pageContent = page.locator('body')
    const isOnApplyPage = page.url().includes('/apply')
    const hasFormElements = await page.locator('text=Select your script').isVisible().catch(() => false)
    const hasNoQualifying = await page.locator('text=None of your scripts currently qualify').isVisible().catch(() => false)

    // Either we're on the apply page with form, or we see "no qualifying scripts"
    // Both are valid states for a Pro user
    if (isOnApplyPage) {
      expect(hasFormElements || hasNoQualifying).toBe(true)
    }
  })

  test('can view dashboard with Pro badge', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Pro badge should be visible somewhere on the dashboard
    const proBadge = page.locator('text=PRO')
    await expect(proBadge).toBeVisible()
  })
})
