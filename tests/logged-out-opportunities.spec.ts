/**
 * Logged-out user opportunity flow tests.
 *
 * Verifies that logged-out users can browse opportunities,
 * see "Get started" CTAs, and all links work.
 */

import { test, expect } from '@playwright/test'

test.describe('Logged-out user — opportunities', () => {
  test('can browse the opportunities listing page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1')).toContainText('Open calls')

    // Should see the count text
    await expect(page.locator('text=currently open')).toBeVisible()
  })

  test('sees "Get started" CTA banner', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    // Should see the logged-out CTA
    await expect(page.locator('text=Upload your script to see which opportunities you qualify for')).toBeVisible()
    await expect(page.locator('text=Get started')).toBeVisible()

    // "Get started" should link to /start
    const getStartedLink = page.locator('a:has-text("Get started")')
    await expect(getStartedLink).toHaveAttribute('href', '/start')
  })

  test('opportunity cards are clickable links to detail pages', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    const cards = page.locator('a[href^="/opportunities/"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    // Each card should link to a detail page
    for (let i = 0; i < Math.min(count, 3); i++) {
      const href = await cards.nth(i).getAttribute('href')
      expect(href).toMatch(/^\/opportunities\/[a-z0-9-]+$/)
    }
  })

  test('can click into opportunity detail page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('a[href^="/opportunities/"]').first()
    await firstCard.click()
    await page.waitForLoadState('networkidle')

    // Should see the detail page with title
    await expect(page.locator('h1')).toBeVisible()

    // Should see "All opportunities" back link
    await expect(page.locator('text=All opportunities')).toBeVisible()
  })

  test('sees login CTA on detail page', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('a[href^="/opportunities/"]').first()
    await firstCard.click()
    await page.waitForLoadState('networkidle')

    // Logged-out users should see a "Log in" link to check qualification
    const loginLink = page.locator('a:has-text("Log in")')
    await expect(loginLink).toBeVisible()
  })

  test('all opportunity card links resolve (no 404s)', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')

    const cards = page.locator('a[href^="/opportunities/"]')
    const count = await cards.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await cards.nth(i).getAttribute('href')
      if (!href) continue

      const response = await page.goto(href)
      expect(response?.status()).toBe(200)

      // Navigate back for the next card
      await page.goto('/opportunities')
      await page.waitForLoadState('networkidle')
    }
  })

  test('OG metadata is present on listing page', async ({ page }) => {
    await page.goto('/opportunities')

    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content')
    const ogDesc = await page.getAttribute('meta[property="og:description"]', 'content')

    expect(ogTitle).toContain('Open Calls')
    expect(ogDesc).toBeTruthy()
  })
})
