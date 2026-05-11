# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pro-user-opportunities.spec.ts >> Pro user — opportunities >> can view dashboard with Pro badge
- Location: tests/pro-user-opportunities.spec.ts:90:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=PRO')
Expected: visible
Error: strict mode violation: locator('text=PRO') resolved to 2 elements:
    1) <span class="inline-flex items-center text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-white px-1.5 py-0.5 rounded shrink-0">Pro</span> aka getByText('Pro', { exact: true })
    2) <p class="text-[12px] text-gray-400 m-0 mb-3">Each review builds on previous feedback to track …</p> aka getByText('Each review builds on')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=PRO')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - navigation [ref=e5]:
      - generic [ref=e6]:
        - link "GEM" [ref=e7] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e9]: GEM
        - generic [ref=e11]:
          - link "Home" [ref=e12] [cursor=pointer]:
            - /url: /dashboard
            - img [ref=e13]
            - text: Home
          - link "Scripts" [ref=e19] [cursor=pointer]:
            - /url: /scripts
            - img [ref=e20]
            - text: Scripts
          - link "Reviews" [ref=e23] [cursor=pointer]:
            - /url: /review
            - img [ref=e24]
            - text: Reviews
          - link "Open Calls" [ref=e27] [cursor=pointer]:
            - /url: /opportunities
            - img [ref=e28]
            - text: Open Calls
          - link "Blog" [ref=e31] [cursor=pointer]:
            - /url: /blog
            - img [ref=e32]
            - text: Blog
          - button "New" [ref=e36]:
            - img [ref=e37]
            - text: New
          - button "Open profile menu" [ref=e40]:
            - generic [ref=e41]: A
    - main [ref=e43]:
      - generic [ref=e44]:
        - generic [ref=e45]:
          - generic [ref=e46]: A
          - generic [ref=e48]:
            - heading "anuj" [level=1] [ref=e49]
            - generic [ref=e50]: Pro
          - link "Settings" [ref=e51] [cursor=pointer]:
            - /url: /profile
            - img [ref=e52]
        - generic [ref=e55]:
          - button "New script" [ref=e56] [cursor=pointer]:
            - img [ref=e57]
            - text: New script
          - button "New portfolio review" [ref=e60] [cursor=pointer]:
            - img [ref=e61]
            - text: New portfolio review
        - generic [ref=e64]:
          - heading "Your portfolio reviews" [level=2] [ref=e66]
          - paragraph [ref=e67]: Each review builds on previous feedback to track your progress over time.
          - generic [ref=e68]:
            - 'link "Portfolio review #2 Complete Reviewed May 9 · 1 script" [ref=e69] [cursor=pointer]':
              - /url: /review/c/8a685b75-d26b-4ec2-9787-8b4ab9b5adf6
              - generic [ref=e71]:
                - generic [ref=e72]:
                  - generic [ref=e73]:
                    - generic [ref=e74]: "Portfolio review #2"
                    - generic [ref=e75]: Complete
                  - img [ref=e76]
                - generic [ref=e78]:
                  - img [ref=e79]
                  - generic [ref=e82]: Reviewed May 9 · 1 script
            - 'link "Portfolio review #1 Complete Reviewed May 9" [ref=e83] [cursor=pointer]':
              - /url: /review/c/b52b556b-0b20-48e1-9dc8-d22a7c8b72a0
              - generic [ref=e85]:
                - generic [ref=e86]:
                  - generic [ref=e87]:
                    - generic [ref=e88]: "Portfolio review #1"
                    - generic [ref=e89]: Complete
                  - img [ref=e90]
                - generic [ref=e92]:
                  - img [ref=e93]
                  - generic [ref=e96]: Reviewed May 9
        - generic [ref=e97]:
          - generic [ref=e98]:
            - heading "Scripts pending review" [level=2] [ref=e99]
            - link "View full portfolio" [ref=e100] [cursor=pointer]:
              - /url: /scripts
          - generic [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e105]: "95"
              - generic [ref=e107]:
                - paragraph [ref=e108]: the sopranos
                - generic [ref=e109]: Series
                - generic [ref=e110]: ·
                - generic [ref=e111]: May 8
              - button [ref=e113]:
                - img [ref=e114]
            - generic [ref=e118]:
              - generic [ref=e119]: Crime
              - generic [ref=e120]: ·
              - button "3 opportunities ▾" [ref=e122]
              - generic [ref=e123]: Eligible for review
              - link "View details →" [ref=e124] [cursor=pointer]:
                - /url: /report/413dd397-341e-4d8c-bea1-38ff4ca82670
  - contentinfo [ref=e125]:
    - generic [ref=e126]:
      - paragraph [ref=e127]: © 2026 GEM Studios
      - navigation [ref=e128]:
        - link "Privacy" [ref=e129] [cursor=pointer]:
          - /url: /privacy
        - link "Terms" [ref=e130] [cursor=pointer]:
          - /url: /terms
        - link "Contact" [ref=e131] [cursor=pointer]:
          - /url: mailto:support@gem.studio
  - alert [ref=e132]
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
  86 |       expect(hasFormElements || hasNoQualifying).toBe(true)
  87 |     }
  88 |   })
  89 | 
  90 |   test('can view dashboard with Pro badge', async ({ page }) => {
  91 |     await page.goto('/dashboard')
  92 |     await page.waitForLoadState('networkidle')
  93 | 
  94 |     // Pro badge should be visible somewhere on the dashboard
  95 |     const proBadge = page.locator('text=PRO')
> 96 |     await expect(proBadge).toBeVisible()
     |                            ^ Error: expect(locator).toBeVisible() failed
  97 |   })
  98 | })
  99 | 
```