# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: free-user-opportunities.spec.ts >> Free user — opportunities >> API rejects apply attempts from free users
- Location: tests/free-user-opportunities.spec.ts:124:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 404
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
          - button "New" [ref=e36]:
            - img [ref=e37]
            - text: New
          - button "Open profile menu" [ref=e40]:
            - generic [ref=e41]: A
    - main [ref=e43]:
      - generic [ref=e44]:
        - generic [ref=e45]:
          - generic [ref=e46]:
            - paragraph [ref=e47]: Browse
            - heading "Open calls" [level=1] [ref=e48]
            - paragraph [ref=e49]: 5 calls currently open
          - link "← Dashboard" [ref=e50] [cursor=pointer]:
            - /url: /dashboard
        - generic [ref=e51]:
          - link "Fast Track GEM Select For undeniable scripts that stop the room. If your work scores 90+, we fast-track it to our development slate — any genre, any format. We option at WGA minimums with aggressive production timelines. Previous fast-track picks have gone to series at major streamers within 18 months of option. 90+ score" [ref=e53] [cursor=pointer]:
            - /url: /opportunities/fast-track
            - generic [ref=e54]:
              - generic [ref=e55]:
                - heading "Fast Track" [level=3] [ref=e56]
                - paragraph [ref=e57]: GEM Select
                - paragraph [ref=e58]: For undeniable scripts that stop the room. If your work scores 90+, we fast-track it to our development slate — any genre, any format. We option at WGA minimums with aggressive production timelines. Previous fast-track picks have gone to series at major streamers within 18 months of option.
                - generic [ref=e60]: 90+ score
              - img [ref=e61]
          - link "Low-Budget Thriller Meridian Pictures We buy contained thrillers that can shoot under $2M. Limited locations, small cast, high tension — the script does the heavy lifting. Think single-location siege films, two-hander psychological thrillers, or mystery-box premises that pay off without VFX. We purchase outright at WGA scale, writer stays attached for credit and rewrites. Currently developing three features in this lane. Feature Pilot Thriller Horror Mystery 70+ score" [ref=e64] [cursor=pointer]:
            - /url: /opportunities/low-budget-thriller
            - generic [ref=e65]:
              - generic [ref=e66]:
                - heading "Low-Budget Thriller" [level=3] [ref=e67]
                - paragraph [ref=e68]: Meridian Pictures
                - paragraph [ref=e69]: We buy contained thrillers that can shoot under $2M. Limited locations, small cast, high tension — the script does the heavy lifting. Think single-location siege films, two-hander psychological thrillers, or mystery-box premises that pay off without VFX. We purchase outright at WGA scale, writer stays attached for credit and rewrites. Currently developing three features in this lane.
                - generic [ref=e70]:
                  - generic [ref=e71]: Feature
                  - generic [ref=e72]: Pilot
                  - generic [ref=e73]: Thriller
                  - generic [ref=e74]: Horror
                  - generic [ref=e75]: Mystery
                  - generic [ref=e76]: 70+ score
              - img [ref=e77]
          - 'link "Vertical / Short-Form Series Short Form Labs High-concept, snackable series built for mobile-first platforms. Episodes under 15 minutes with fast hooks and cliffhanger endings. We are looking for creators who understand short-form pacing — every scene earns its runtime. Genre-forward concepts preferred: thriller, horror, sci-fi, romance. We handle production and distribution across TikTok, YouTube Shorts, and Snapchat Spotlight. Short Pilot 55+ score" [ref=e80] [cursor=pointer]':
            - /url: /opportunities/vertical-series
            - generic [ref=e81]:
              - generic [ref=e82]:
                - heading "Vertical / Short-Form Series" [level=3] [ref=e83]
                - paragraph [ref=e84]: Short Form Labs
                - paragraph [ref=e85]: "High-concept, snackable series built for mobile-first platforms. Episodes under 15 minutes with fast hooks and cliffhanger endings. We are looking for creators who understand short-form pacing — every scene earns its runtime. Genre-forward concepts preferred: thriller, horror, sci-fi, romance. We handle production and distribution across TikTok, YouTube Shorts, and Snapchat Spotlight."
                - generic [ref=e86]:
                  - generic [ref=e87]: Short
                  - generic [ref=e88]: Pilot
                  - generic [ref=e89]: 55+ score
              - img [ref=e90]
          - link "Half-Hour Comedy Basecamp Entertainment Building our comedy slate and looking for fresh, distinctive voices. Single-cam, multi-cam, or animated — format is flexible if the writing is sharp. We want characters audiences want to spend time with, dialogue that sounds like real people, and premises with series legs. Currently producing for both network and streaming, so think broad appeal with a specific point of view. Pilot Comedy Dramedy 60+ score" [ref=e93] [cursor=pointer]:
            - /url: /opportunities/half-hour-comedy
            - generic [ref=e94]:
              - generic [ref=e95]:
                - heading "Half-Hour Comedy" [level=3] [ref=e96]
                - paragraph [ref=e97]: Basecamp Entertainment
                - paragraph [ref=e98]: Building our comedy slate and looking for fresh, distinctive voices. Single-cam, multi-cam, or animated — format is flexible if the writing is sharp. We want characters audiences want to spend time with, dialogue that sounds like real people, and premises with series legs. Currently producing for both network and streaming, so think broad appeal with a specific point of view.
                - generic [ref=e99]:
                  - generic [ref=e100]: Pilot
                  - generic [ref=e101]: Comedy
                  - generic [ref=e102]: Dramedy
                  - generic [ref=e103]: 60+ score
              - img [ref=e104]
          - generic [ref=e106]:
            - link "Daring & Original (Wild Card) GEM Select The wildcard slot. Any format, any genre, any score. If your script is genuinely original and takes creative risks that nobody else would greenlight, this is where it goes. We are specifically looking for the scripts that don't fit neatly into other categories — genre-bending, structurally inventive, tonally unexpected. Previous picks include an animated anthology and a found-footage limited series. 45+ score" [ref=e107] [cursor=pointer]:
              - /url: /opportunities/daring-original
              - generic [ref=e108]:
                - generic [ref=e109]:
                  - heading "Daring & Original (Wild Card)" [level=3] [ref=e110]
                  - paragraph [ref=e111]: GEM Select
                  - paragraph [ref=e112]: The wildcard slot. Any format, any genre, any score. If your script is genuinely original and takes creative risks that nobody else would greenlight, this is where it goes. We are specifically looking for the scripts that don't fit neatly into other categories — genre-bending, structurally inventive, tonally unexpected. Previous picks include an animated anthology and a found-footage limited series.
                  - generic [ref=e114]: 45+ score
                - img [ref=e115]
            - generic [ref=e117]:
              - paragraph [ref=e118]: 1 of your script fits
              - link "I Work in Marketing" [ref=e120] [cursor=pointer]:
                - /url: /report/2f60abbd-5d03-469a-bd72-14325e627b16
        - generic [ref=e121]:
          - paragraph [ref=e122]: Qualifying scripts are automatically included when you request consideration.
          - link "Request consideration →" [ref=e123] [cursor=pointer]:
            - /url: /consideration/submit
  - contentinfo [ref=e124]:
    - generic [ref=e125]:
      - paragraph [ref=e126]: © 2026 GEM Studios
      - navigation [ref=e127]:
        - link "Privacy" [ref=e128] [cursor=pointer]:
          - /url: /privacy
        - link "Terms" [ref=e129] [cursor=pointer]:
          - /url: /terms
        - link "Contact" [ref=e130] [cursor=pointer]:
          - /url: mailto:support@gem.studio
  - alert [ref=e131]
```

# Test source

```ts
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
  120 |     await page.waitForURL(/\/opportunities\/[^/]+$/, { timeout: 10000 })
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
> 145 |     expect(response.status()).toBe(403)
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  146 |     const body = await response.json()
  147 |     expect(body.error).toContain('Upgrade to Pro')
  148 |   })
  149 | })
  150 | 
```