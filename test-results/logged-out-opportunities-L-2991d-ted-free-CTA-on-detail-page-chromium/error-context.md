# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: logged-out-opportunities.spec.ts >> Logged-out user — opportunities >> sees "Get started free" CTA on detail page
- Location: tests/logged-out-opportunities.spec.ts:63:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Get started free')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Get started free')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - navigation [ref=e5]:
      - generic [ref=e6]:
        - link "GEM" [ref=e7] [cursor=pointer]:
          - /url: /
          - generic [ref=e9]: GEM
        - generic [ref=e11]:
          - link "Home" [ref=e12] [cursor=pointer]:
            - /url: /
            - img [ref=e13]
            - text: Home
          - link "Scripts" [ref=e18] [cursor=pointer]:
            - /url: /scripts
            - img [ref=e19]
            - text: Scripts
          - link "Reviews" [ref=e22] [cursor=pointer]:
            - /url: /review
            - img [ref=e23]
            - text: Reviews
          - link "Open Calls" [ref=e26] [cursor=pointer]:
            - /url: /opportunities
            - img [ref=e27]
            - text: Open Calls
          - link "Blog" [ref=e31] [cursor=pointer]:
            - /url: /blog
            - img [ref=e32]
            - text: Blog
          - link "Sign up" [ref=e34] [cursor=pointer]:
            - /url: /start
          - link "Log in" [ref=e35] [cursor=pointer]:
            - /url: /login
    - generic [ref=e37]:
      - link "← All opportunities" [ref=e38] [cursor=pointer]:
        - /url: /opportunities
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e42]: option
          - generic [ref=e43]: producer
        - heading "Fast Track" [level=1] [ref=e44]
        - paragraph [ref=e45]: producer · GEM Select
        - generic [ref=e47]: Min score 90
        - paragraph [ref=e49]: For undeniable scripts that stop the room. If your work scores 90+, we fast-track it to our development slate — any genre, any format. We option at WGA minimums with aggressive production timelines. Previous fast-track picks have gone to series at major streamers within 18 months of option.
        - generic [ref=e50]:
          - paragraph [ref=e51]: The opportunity
          - paragraph [ref=e52]: Option your script with a path to production. You retain rights until a purchase is triggered.
        - paragraph [ref=e55]:
          - link "Log in" [ref=e56] [cursor=pointer]:
            - /url: /login?redirect=/opportunities/fast-track
          - text: to see if your scripts qualify for this opportunity.
  - contentinfo [ref=e57]:
    - generic [ref=e58]:
      - paragraph [ref=e59]: © 2026 GEM Studios
      - navigation [ref=e60]:
        - link "Privacy" [ref=e61] [cursor=pointer]:
          - /url: /privacy
        - link "Terms" [ref=e62] [cursor=pointer]:
          - /url: /terms
        - link "Contact" [ref=e63] [cursor=pointer]:
          - /url: mailto:support@gem.studio
  - alert [ref=e64]: Fast Track — GEM — GEM
```

# Test source

```ts
  1   | /**
  2   |  * Logged-out user opportunity flow tests.
  3   |  *
  4   |  * Verifies that logged-out users can browse opportunities,
  5   |  * see "Get started" CTAs, and all links work.
  6   |  */
  7   | 
  8   | import { test, expect } from '@playwright/test'
  9   | 
  10  | test.describe('Logged-out user — opportunities', () => {
  11  |   test('can browse the opportunities listing page', async ({ page }) => {
  12  |     await page.goto('/opportunities')
  13  |     await page.waitForLoadState('networkidle')
  14  | 
  15  |     await expect(page.locator('h1')).toContainText('Open calls')
  16  | 
  17  |     // Should see the count text
  18  |     await expect(page.locator('text=currently open')).toBeVisible()
  19  |   })
  20  | 
  21  |   test('sees "Get started" CTA banner', async ({ page }) => {
  22  |     await page.goto('/opportunities')
  23  |     await page.waitForLoadState('networkidle')
  24  | 
  25  |     // Should see the logged-out CTA
  26  |     await expect(page.locator('text=Upload your script to see which calls you qualify for')).toBeVisible()
  27  |     await expect(page.locator('text=Get started')).toBeVisible()
  28  | 
  29  |     // "Get started" should link to /start
  30  |     const getStartedLink = page.locator('a:has-text("Get started")')
  31  |     await expect(getStartedLink).toHaveAttribute('href', '/start')
  32  |   })
  33  | 
  34  |   test('sees "Learn more" on all cards (not Apply)', async ({ page }) => {
  35  |     await page.goto('/opportunities')
  36  |     await page.waitForLoadState('networkidle')
  37  | 
  38  |     const cards = page.locator('a[href^="/opportunities/"]')
  39  |     const count = await cards.count()
  40  | 
  41  |     for (let i = 0; i < Math.min(count, 5); i++) {
  42  |       const card = cards.nth(i)
  43  |       // Each card should have "Learn more" text
  44  |       await expect(card.locator('text=Learn more')).toBeVisible()
  45  |     }
  46  |   })
  47  | 
  48  |   test('can click into opportunity detail page', async ({ page }) => {
  49  |     await page.goto('/opportunities')
  50  |     await page.waitForLoadState('networkidle')
  51  | 
  52  |     const firstCard = page.locator('a[href^="/opportunities/"]').first()
  53  |     await firstCard.click()
  54  |     await page.waitForLoadState('networkidle')
  55  | 
  56  |     // Should see the detail page with title
  57  |     await expect(page.locator('h1')).toBeVisible()
  58  | 
  59  |     // Should see "All opportunities" back link
  60  |     await expect(page.locator('text=All opportunities')).toBeVisible()
  61  |   })
  62  | 
  63  |   test('sees "Get started free" CTA on detail page', async ({ page }) => {
  64  |     await page.goto('/opportunities')
  65  |     await page.waitForLoadState('networkidle')
  66  | 
  67  |     const firstCard = page.locator('a[href^="/opportunities/"]').first()
  68  |     await firstCard.click()
  69  |     await page.waitForLoadState('networkidle')
  70  | 
  71  |     // Should see the logged-out CTA
> 72  |     await expect(page.locator('text=Get started free')).toBeVisible()
      |                                                         ^ Error: expect(locator).toBeVisible() failed
  73  | 
  74  |     // Should link to /start
  75  |     const ctaLink = page.locator('a:has-text("Get started free")')
  76  |     await expect(ctaLink).toHaveAttribute('href', '/start')
  77  |   })
  78  | 
  79  |   test('all opportunity card links resolve (no 404s)', async ({ page }) => {
  80  |     await page.goto('/opportunities')
  81  |     await page.waitForLoadState('networkidle')
  82  | 
  83  |     const cards = page.locator('a[href^="/opportunities/"]')
  84  |     const count = await cards.count()
  85  | 
  86  |     for (let i = 0; i < Math.min(count, 5); i++) {
  87  |       const href = await cards.nth(i).getAttribute('href')
  88  |       if (!href) continue
  89  | 
  90  |       const response = await page.goto(href)
  91  |       expect(response?.status()).toBe(200)
  92  | 
  93  |       // Navigate back for the next card
  94  |       await page.goto('/opportunities')
  95  |       await page.waitForLoadState('networkidle')
  96  |     }
  97  |   })
  98  | 
  99  |   test('OG metadata is present on listing page', async ({ page }) => {
  100 |     await page.goto('/opportunities')
  101 | 
  102 |     const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content')
  103 |     const ogDesc = await page.getAttribute('meta[property="og:description"]', 'content')
  104 | 
  105 |     expect(ogTitle).toContain('Open Calls')
  106 |     expect(ogDesc).toBeTruthy()
  107 |   })
  108 | })
  109 | 
```