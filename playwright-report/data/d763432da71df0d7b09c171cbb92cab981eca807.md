# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pro-user-opportunities.spec.ts >> Pro user — opportunities >> can access the apply page
- Location: tests/pro-user-opportunities.spec.ts:64:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - heading "404" [level=1] [ref=e5]
    - heading "This page could not be found." [level=2] [ref=e7]
  - contentinfo [ref=e8]:
    - generic [ref=e9]:
      - paragraph [ref=e10]: © 2026 GEM Studios
      - navigation [ref=e11]:
        - link "Privacy" [ref=e12] [cursor=pointer]:
          - /url: /privacy
        - link "Terms" [ref=e13] [cursor=pointer]:
          - /url: /terms
        - link "Contact" [ref=e14] [cursor=pointer]:
          - /url: mailto:support@gem.studio
  - alert [ref=e15]
```

# Test source

```ts
  1  | /**
  2  |  * Pro user opportunity flow tests.
  3  |  *
  4  |  * Verifies that Pro users can browse AND apply to opportunities.
  5  |  * Apply buttons should be active and functional.
  6  |  * The apply page should load and show the form.
  7  |  */
  8  | 
  9  | import { test, expect } from '@playwright/test'
  10 | import { loginAs, getProCredentials } from './helpers'
  11 | 
  12 | test.describe('Pro user — opportunities', () => {
  13 |   test.beforeEach(async ({ page }) => {
  14 |     const { email, password } = getProCredentials()
  15 |     await loginAs(page, email, password)
  16 |   })
  17 | 
  18 |   test('can browse the opportunities listing page', async ({ page }) => {
  19 |     await page.goto('/opportunities')
  20 |     await page.waitForLoadState('networkidle')
  21 | 
  22 |     await expect(page.locator('h1')).toContainText('Open calls')
  23 | 
  24 |     const cards = page.locator('a[href^="/opportunities/"]')
  25 |     await expect(cards.first()).toBeVisible()
  26 |   })
  27 | 
  28 |   test('sees "Apply" on qualifying cards (not "Pro" badge)', async ({ page }) => {
  29 |     await page.goto('/opportunities')
  30 |     await page.waitForLoadState('networkidle')
  31 | 
  32 |     // If user has qualifying scripts, they should see "Apply →" not "Pro" pill
  33 |     // Look for the purple "Apply" text with arrow
  34 |     const applyLink = page.locator('span:has-text("Apply")').first()
  35 |     const proBadge = page.locator('span:has-text("Pro")').first()
  36 | 
  37 |     const applyVisible = await applyLink.isVisible().catch(() => false)
  38 |     const proVisible = await proBadge.isVisible().catch(() => false)
  39 | 
  40 |     // Pro users should NOT see the "Pro" upgrade badge
  41 |     // (They might see "Applied" badge if they already applied, which is fine)
  42 |     if (applyVisible) {
  43 |       expect(proVisible).toBe(false)
  44 |     }
  45 |   })
  46 | 
  47 |   test('sees working Apply button on opportunity detail page', async ({ page }) => {
  48 |     await page.goto('/opportunities')
  49 |     await page.waitForLoadState('networkidle')
  50 | 
  51 |     const firstCard = page.locator('a[href^="/opportunities/"]').first()
  52 |     await firstCard.click()
  53 |     await page.waitForLoadState('networkidle')
  54 | 
  55 |     // Should see either:
  56 |     // 1. "Apply now" button (qualifying, not yet applied)
  57 |     // 2. "You've already applied" (already applied)
  58 |     // 3. "None of your scripts match" (no qualifying scripts)
  59 |     // Should NOT see "Upgrade to Pro"
  60 |     const upgradeButton = page.locator('text=Upgrade to Pro')
  61 |     await expect(upgradeButton).not.toBeVisible()
  62 |   })
  63 | 
  64 |   test('can access the apply page', async ({ page }) => {
  65 |     await page.goto('/opportunities')
  66 |     await page.waitForLoadState('networkidle')
  67 | 
  68 |     const firstCard = page.locator('a[href^="/opportunities/"]').first()
  69 |     const href = await firstCard.getAttribute('href')
  70 |     if (!href) return
  71 | 
  72 |     // Navigate to apply page
  73 |     await page.goto(`${href}/apply`)
  74 |     await page.waitForLoadState('networkidle')
  75 | 
  76 |     // Should stay on the apply page (not get redirected)
  77 |     // Should see the apply form elements
  78 |     const pageContent = page.locator('body')
  79 |     const isOnApplyPage = page.url().includes('/apply')
  80 |     const hasFormElements = await page.locator('text=Select your script').isVisible().catch(() => false)
  81 |     const hasNoQualifying = await page.locator('text=None of your scripts currently qualify').isVisible().catch(() => false)
  82 | 
  83 |     // Either we're on the apply page with form, or we see "no qualifying scripts"
  84 |     // Both are valid states for a Pro user
  85 |     if (isOnApplyPage) {
> 86 |       expect(hasFormElements || hasNoQualifying).toBe(true)
     |                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  87 |     }
  88 |   })
  89 | 
  90 |   test('can view dashboard with Pro badge', async ({ page }) => {
  91 |     await page.goto('/dashboard')
  92 |     await page.waitForLoadState('networkidle')
  93 | 
  94 |     // Pro badge should be visible somewhere on the dashboard
  95 |     const proBadge = page.locator('text=PRO')
  96 |     await expect(proBadge).toBeVisible()
  97 |   })
  98 | })
  99 | 
```