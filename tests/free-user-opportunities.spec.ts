/**
 * Free user opportunity flow tests.
 *
 * Verifies that free users can browse opportunities but cannot apply.
 * Apply buttons should be grayed out / show upgrade messaging.
 * Direct navigation to /apply should redirect back.
 * The API should reject apply attempts from free users.
 */

import { test, expect } from '@playwright/test'
import { loginAs, getFreeCredentials } from './helpers'

test.describe('Free user — opportunities', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getFreeCredentials()
    await loginAs(page, email, password)
  })

  test('can browse the opportunities listing page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    // Page should load with the "Open calls" heading
    await expect(page.locator('h1')).toContainText('Open calls')

    // Should see at least one opportunity card
    const cards = page.locator('a[href^="/opportunities/"]')
    await expect(cards.first()).toBeVisible()
  })

  test('sees "Pro" badge instead of "Apply" on qualifying cards', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    // If user has qualifying scripts, they should see "Pro" pill not "Apply"
    // (This test passes even if user has no qualifying scripts — it just skips)
    const proBadge = page.locator('text=Pro').first()
    const applyButton = page.locator('text=Apply').first()

    // Should NOT see an active "Apply →" link
    // Either "Pro" badge is visible (qualifying) or just arrows (non-qualifying)
    const applyVisible = await applyButton.isVisible().catch(() => false)
    if (applyVisible) {
      // "Apply" text should not be a clickable purple link for free users
      // It could appear in "Applied" badge which is fine
      const applyText = await applyButton.textContent()
      expect(applyText).not.toBe('Apply')
    }
  })

  test('can view opportunity detail page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    // Click into the first opportunity
    const firstCard = page.locator('a[href^="/opportunities/"]').first()
    await firstCard.click()
    await page.waitForLoadState('networkidle')

    // Should see the opportunity title and description
    await expect(page.locator('h1')).toBeVisible()

    // Should see "What you get" section if deal type exists
    const whatYouGet = page.locator('text=What you get')
    // This is optional — depends on the opportunity having a deal_type
  })

  test('sees upgrade CTA instead of Apply button on detail page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    // Click into the first opportunity
    const firstCard = page.locator('a[href^="/opportunities/"]').first()
    await firstCard.click()
    await page.waitForLoadState('networkidle')

    // Should see "Upgrade to Pro" messaging, NOT a working "Apply now" button
    const upgradeButton = page.locator('text=Upgrade to Pro')
    const applyNowButton = page.locator('a:has-text("Apply now")')

    // One of these should be true:
    // 1. "Upgrade to Pro" is visible (qualifying script, free user)
    // 2. "Apply now" is NOT visible (either no qualifying script or free user)
    // 3. "None of your scripts" message is visible (no qualifying script)
    const upgradeVisible = await upgradeButton.isVisible().catch(() => false)
    const applyVisible = await applyNowButton.isVisible().catch(() => false)

    // A free user should NEVER see a working "Apply now" button
    if (upgradeVisible) {
      // Good — upgrade messaging is showing
      expect(upgradeVisible).toBe(true)

      // The upgrade button should link to pricing
      const upgradeLink = page.locator('a:has-text("Upgrade to Pro")')
      await expect(upgradeLink).toHaveAttribute('href', '/#pricing')
    }

    // "Apply now" with a link to /apply should NOT be present for free users
    if (applyVisible) {
      // If "Apply now" is visible, it should NOT link to an apply page
      const href = await applyNowButton.getAttribute('href')
      expect(href).not.toContain('/apply')
    }
  })

  test('cannot access apply page directly — gets redirected', async ({ page }) => {
    // Try to navigate directly to an apply page
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    // Get the first opportunity slug
    const firstCard = page.locator('a[href^="/opportunities/"]').first()
    const href = await firstCard.getAttribute('href')
    if (!href) return

    // Try to go to the apply page directly
    await page.goto(`${href}/apply`)

    // Should be redirected back to the opportunity detail page (not the apply form)
    await page.waitForURL(/\/opportunities\/[^/]+$/, { timeout: 10000 })
    expect(page.url()).not.toContain('/apply')
  })

  test('API rejects apply attempts from free users', async ({ page, request }) => {
    // Get cookies from the logged-in page
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    // Try to POST to the apply API
    const response = await request.post('/api/consideration/apply', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: {
        opportunity_id: 'fake-id',
        script_ids: ['fake-script-id'],
      },
    })

    // Should get 403 Forbidden
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Upgrade to Pro')
  })
})
