# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: free-user-opportunities.spec.ts >> Free user — opportunities >> cannot access apply page directly — gets redirected
- Location: tests/free-user-opportunities.spec.ts:106:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "https://gem-pilot.vercel.app/opportunities/fast-track/apply"
============================================================
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
  20  |     await page.goto('/opportunities')
  21  |     await page.waitForLoadState('networkidle')
  22  | 
  23  |     // Page should load with the "Open calls" heading
  24  |     await expect(page.locator('h1')).toContainText('Open calls')
  25  | 
  26  |     // Should see at least one opportunity card
  27  |     const cards = page.locator('a[href^="/opportunities/"]')
  28  |     await expect(cards.first()).toBeVisible()
  29  |   })
  30  | 
  31  |   test('sees "Pro" badge instead of "Apply" on qualifying cards', async ({ page }) => {
  32  |     await page.goto('/opportunities')
  33  |     await page.waitForLoadState('networkidle')
  34  | 
  35  |     // If user has qualifying scripts, they should see "Pro" pill not "Apply"
  36  |     // (This test passes even if user has no qualifying scripts — it just skips)
  37  |     const proBadge = page.locator('text=Pro').first()
  38  |     const applyButton = page.locator('text=Apply').first()
  39  | 
  40  |     // Should NOT see an active "Apply →" link
  41  |     // Either "Pro" badge is visible (qualifying) or just arrows (non-qualifying)
  42  |     const applyVisible = await applyButton.isVisible().catch(() => false)
  43  |     if (applyVisible) {
  44  |       // "Apply" text should not be a clickable purple link for free users
  45  |       // It could appear in "Applied" badge which is fine
  46  |       const applyText = await applyButton.textContent()
  47  |       expect(applyText).not.toBe('Apply')
  48  |     }
  49  |   })
  50  | 
  51  |   test('can view opportunity detail page', async ({ page }) => {
  52  |     await page.goto('/opportunities')
  53  |     await page.waitForLoadState('networkidle')
  54  | 
  55  |     // Click into the first opportunity
  56  |     const firstCard = page.locator('a[href^="/opportunities/"]').first()
  57  |     await firstCard.click()
  58  |     await page.waitForLoadState('networkidle')
  59  | 
  60  |     // Should see the opportunity title and description
  61  |     await expect(page.locator('h1')).toBeVisible()
  62  | 
  63  |     // Should see "What you get" section if deal type exists
  64  |     const whatYouGet = page.locator('text=What you get')
  65  |     // This is optional — depends on the opportunity having a deal_type
  66  |   })
  67  | 
  68  |   test('sees upgrade CTA instead of Apply button on detail page', async ({ page }) => {
  69  |     await page.goto('/opportunities')
  70  |     await page.waitForLoadState('networkidle')
  71  | 
  72  |     // Click into the first opportunity
  73  |     const firstCard = page.locator('a[href^="/opportunities/"]').first()
  74  |     await firstCard.click()
  75  |     await page.waitForLoadState('networkidle')
  76  | 
  77  |     // Should see "Upgrade to Pro" messaging, NOT a working "Apply now" button
  78  |     const upgradeButton = page.locator('text=Upgrade to Pro')
  79  |     const applyNowButton = page.locator('a:has-text("Apply now")')
  80  | 
  81  |     // One of these should be true:
  82  |     // 1. "Upgrade to Pro" is visible (qualifying script, free user)
  83  |     // 2. "Apply now" is NOT visible (either no qualifying script or free user)
  84  |     // 3. "None of your scripts" message is visible (no qualifying script)
  85  |     const upgradeVisible = await upgradeButton.isVisible().catch(() => false)
  86  |     const applyVisible = await applyNowButton.isVisible().catch(() => false)
  87  | 
  88  |     // A free user should NEVER see a working "Apply now" button
  89  |     if (upgradeVisible) {
  90  |       // Good — upgrade messaging is showing
  91  |       expect(upgradeVisible).toBe(true)
  92  | 
  93  |       // The upgrade button should link to pricing
  94  |       const upgradeLink = page.locator('a:has-text("Upgrade to Pro")')
  95  |       await expect(upgradeLink).toHaveAttribute('href', '/#pricing')
  96  |     }
  97  | 
  98  |     // "Apply now" with a link to /apply should NOT be present for free users
  99  |     if (applyVisible) {
  100 |       // If "Apply now" is visible, it should NOT link to an apply page
  101 |       const href = await applyNowButton.getAttribute('href')
  102 |       expect(href).not.toContain('/apply')
  103 |     }
  104 |   })
  105 | 
  106 |   test('cannot access apply page directly — gets redirected', async ({ page }) => {
  107 |     // Try to navigate directly to an apply page
  108 |     await page.goto('/opportunities')
  109 |     await page.waitForLoadState('networkidle')
  110 | 
  111 |     // Get the first opportunity slug
  112 |     const firstCard = page.locator('a[href^="/opportunities/"]').first()
  113 |     const href = await firstCard.getAttribute('href')
  114 |     if (!href) return
  115 | 
  116 |     // Try to go to the apply page directly
  117 |     await page.goto(`${href}/apply`)
  118 | 
  119 |     // Should be redirected back to the opportunity detail page (not the apply form)
> 120 |     await page.waitForURL(/\/opportunities\/[^/]+$/, { timeout: 10000 })
      |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  121 |     expect(page.url()).not.toContain('/apply')
  122 |   })
  123 | 
  124 |   test('API rejects apply attempts from free users', async ({ page, request }) => {
  125 |     // Get cookies from the logged-in page
  126 |     await page.goto('/opportunities')
  127 |     await page.waitForLoadState('networkidle')
  128 | 
  129 |     const cookies = await page.context().cookies()
  130 |     const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
  131 | 
  132 |     // Try to POST to the apply API
  133 |     const response = await request.post('/api/consideration/apply', {
  134 |       headers: {
  135 |         'Content-Type': 'application/json',
  136 |         'Cookie': cookieHeader,
  137 |       },
  138 |       data: {
  139 |         opportunity_id: 'fake-id',
  140 |         script_ids: ['fake-script-id'],
  141 |       },
  142 |     })
  143 | 
  144 |     // Should get 403 Forbidden
  145 |     expect(response.status()).toBe(403)
  146 |     const body = await response.json()
  147 |     expect(body.error).toContain('Upgrade to Pro')
  148 |   })
  149 | })
  150 | 
```