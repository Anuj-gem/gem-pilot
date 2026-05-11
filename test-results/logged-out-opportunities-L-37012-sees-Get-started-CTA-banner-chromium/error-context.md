# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: logged-out-opportunities.spec.ts >> Logged-out user — opportunities >> sees "Get started" CTA banner
- Location: tests/logged-out-opportunities.spec.ts:21:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Upload your script to see which calls you qualify for')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Upload your script to see which calls you qualify for')

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
      - generic [ref=e39]:
        - paragraph [ref=e40]: Browse
        - heading "Open calls" [level=1] [ref=e41]
        - paragraph [ref=e42]: 5 calls currently open
      - generic [ref=e43]:
        - generic [ref=e44]:
          - paragraph [ref=e45]: Upload your script to see which opportunities you qualify for
          - paragraph [ref=e46]: Get a free evaluation and we'll match you to open calls automatically.
        - link "Get started" [ref=e47] [cursor=pointer]:
          - /url: /start
          - text: Get started
          - img [ref=e48]
      - generic [ref=e50]:
        - link "Fast Track GEM Select For undeniable scripts that stop the room. If your work scores 90+, we fast-track it to our development slate — any genre, any format. We option at WGA minimums with aggressive production timelines. Previous fast-track picks have gone to series at major streamers within 18 months of option. 90+ score" [ref=e52] [cursor=pointer]:
          - /url: /opportunities/fast-track
          - generic [ref=e53]:
            - generic [ref=e54]:
              - heading "Fast Track" [level=3] [ref=e55]
              - paragraph [ref=e56]: GEM Select
              - paragraph [ref=e57]: For undeniable scripts that stop the room. If your work scores 90+, we fast-track it to our development slate — any genre, any format. We option at WGA minimums with aggressive production timelines. Previous fast-track picks have gone to series at major streamers within 18 months of option.
              - generic [ref=e59]: 90+ score
            - img [ref=e60]
        - link "Low-Budget Thriller Meridian Pictures We buy contained thrillers that can shoot under $2M. Limited locations, small cast, high tension — the script does the heavy lifting. Think single-location siege films, two-hander psychological thrillers, or mystery-box premises that pay off without VFX. We purchase outright at WGA scale, writer stays attached for credit and rewrites. Currently developing three features in this lane. Feature Pilot Thriller Horror Mystery 70+ score" [ref=e63] [cursor=pointer]:
          - /url: /opportunities/low-budget-thriller
          - generic [ref=e64]:
            - generic [ref=e65]:
              - heading "Low-Budget Thriller" [level=3] [ref=e66]
              - paragraph [ref=e67]: Meridian Pictures
              - paragraph [ref=e68]: We buy contained thrillers that can shoot under $2M. Limited locations, small cast, high tension — the script does the heavy lifting. Think single-location siege films, two-hander psychological thrillers, or mystery-box premises that pay off without VFX. We purchase outright at WGA scale, writer stays attached for credit and rewrites. Currently developing three features in this lane.
              - generic [ref=e69]:
                - generic [ref=e70]: Feature
                - generic [ref=e71]: Pilot
                - generic [ref=e72]: Thriller
                - generic [ref=e73]: Horror
                - generic [ref=e74]: Mystery
                - generic [ref=e75]: 70+ score
            - img [ref=e76]
        - 'link "Vertical / Short-Form Series Short Form Labs High-concept, snackable series built for mobile-first platforms. Episodes under 15 minutes with fast hooks and cliffhanger endings. We are looking for creators who understand short-form pacing — every scene earns its runtime. Genre-forward concepts preferred: thriller, horror, sci-fi, romance. We handle production and distribution across TikTok, YouTube Shorts, and Snapchat Spotlight. Short Pilot 55+ score" [ref=e79] [cursor=pointer]':
          - /url: /opportunities/vertical-series
          - generic [ref=e80]:
            - generic [ref=e81]:
              - heading "Vertical / Short-Form Series" [level=3] [ref=e82]
              - paragraph [ref=e83]: Short Form Labs
              - paragraph [ref=e84]: "High-concept, snackable series built for mobile-first platforms. Episodes under 15 minutes with fast hooks and cliffhanger endings. We are looking for creators who understand short-form pacing — every scene earns its runtime. Genre-forward concepts preferred: thriller, horror, sci-fi, romance. We handle production and distribution across TikTok, YouTube Shorts, and Snapchat Spotlight."
              - generic [ref=e85]:
                - generic [ref=e86]: Short
                - generic [ref=e87]: Pilot
                - generic [ref=e88]: 55+ score
            - img [ref=e89]
        - link "Half-Hour Comedy Basecamp Entertainment Building our comedy slate and looking for fresh, distinctive voices. Single-cam, multi-cam, or animated — format is flexible if the writing is sharp. We want characters audiences want to spend time with, dialogue that sounds like real people, and premises with series legs. Currently producing for both network and streaming, so think broad appeal with a specific point of view. Pilot Comedy Dramedy 60+ score" [ref=e92] [cursor=pointer]:
          - /url: /opportunities/half-hour-comedy
          - generic [ref=e93]:
            - generic [ref=e94]:
              - heading "Half-Hour Comedy" [level=3] [ref=e95]
              - paragraph [ref=e96]: Basecamp Entertainment
              - paragraph [ref=e97]: Building our comedy slate and looking for fresh, distinctive voices. Single-cam, multi-cam, or animated — format is flexible if the writing is sharp. We want characters audiences want to spend time with, dialogue that sounds like real people, and premises with series legs. Currently producing for both network and streaming, so think broad appeal with a specific point of view.
              - generic [ref=e98]:
                - generic [ref=e99]: Pilot
                - generic [ref=e100]: Comedy
                - generic [ref=e101]: Dramedy
                - generic [ref=e102]: 60+ score
            - img [ref=e103]
        - link "Daring & Original (Wild Card) GEM Select The wildcard slot. Any format, any genre, any score. If your script is genuinely original and takes creative risks that nobody else would greenlight, this is where it goes. We are specifically looking for the scripts that don't fit neatly into other categories — genre-bending, structurally inventive, tonally unexpected. Previous picks include an animated anthology and a found-footage limited series. 45+ score" [ref=e106] [cursor=pointer]:
          - /url: /opportunities/daring-original
          - generic [ref=e107]:
            - generic [ref=e108]:
              - heading "Daring & Original (Wild Card)" [level=3] [ref=e109]
              - paragraph [ref=e110]: GEM Select
              - paragraph [ref=e111]: The wildcard slot. Any format, any genre, any score. If your script is genuinely original and takes creative risks that nobody else would greenlight, this is where it goes. We are specifically looking for the scripts that don't fit neatly into other categories — genre-bending, structurally inventive, tonally unexpected. Previous picks include an animated anthology and a found-footage limited series.
              - generic [ref=e113]: 45+ score
            - img [ref=e114]
  - contentinfo [ref=e116]:
    - generic [ref=e117]:
      - paragraph [ref=e118]: © 2026 GEM Studios
      - navigation [ref=e119]:
        - link "Privacy" [ref=e120] [cursor=pointer]:
          - /url: /privacy
        - link "Terms" [ref=e121] [cursor=pointer]:
          - /url: /terms
        - link "Contact" [ref=e122] [cursor=pointer]:
          - /url: mailto:support@gem.studio
  - alert [ref=e123]
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
> 26  |     await expect(page.locator('text=Upload your script to see which calls you qualify for')).toBeVisible()
      |                                                                                              ^ Error: expect(locator).toBeVisible() failed
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
  72  |     await expect(page.locator('text=Get started free')).toBeVisible()
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