# GEM Goes 100% Free — Launch Runbook

**Status:** PLAN — nothing executed yet. Review before we touch code or billing.
**Decision (2026-06-05):** GEM becomes 100% free. No subscriptions. The free product is the marketing engine; we own the data and the funnel; we monetize later on the upside (deals / curated access to industry), not on writers.

---

## 1. What "free" actually unlocks (the full surface)

Everything currently gated behind Pro becomes available to everyone:

- Unlimited evaluations (already unlimited — no change)
- Publish to Discover (currently Pro-gated — we just added that gate; it comes back off)
- Privacy controls on reports
- PDF downloads
- Unlimited opportunity applications (currently capped/gated for free)
- Contact writers / be contacted
- Peer reviews
- Considerations / portfolio reviews (currently "one per free user")
- Producer matching for ALL writers (currently only Pro scripts match)

Net: the only thing that disappears is the $20/mo charge and every "upgrade" wall.

---

## 2. App changes — the airtight list

### 2a. Core mechanism: one `FREE_MODE` flag
Create a single helper (e.g. `src/lib/subscription.ts`):
```
export const FREE_MODE = true
export function isPro(status?: string | null) {
  return FREE_MODE || status === 'active' || status === 'trialing'
}
```
Route every gate through it. Flipping `FREE_MODE = false` reverts the entire change in one line (your "we can always go back" requirement).

### 2b. Gating computation sites to route through `isPro()` (force true)
These are the places that currently decide access from `subscription_status`:
- `src/app/(app)/layout.tsx:157` — app-wide isPro (drives nav, upgrade modal listener, most UI gates)
- `src/app/(app)/dashboard/page.tsx:100`
- `src/app/partner/layout.tsx:49`
- `src/app/(app)/report/[id]/page.tsx:285,298` — owner + viewer (report blur/locks)
- `src/app/(app)/report/[id]/layout.tsx:58`, `opengraph-image.tsx:94`
- `src/app/(app)/opportunities/page.tsx:63`, `[slug]/page.tsx:132`, `[slug]/apply/page.tsx:66`
- `src/app/(app)/discover/page.tsx:71` — insider features
- `src/app/(app)/consideration/submit/page.tsx:44`, `review/c/[id]/page.tsx:133`

### 2c. API routes that BLOCK server-side (must bypass too — or UI lies)
- `src/app/api/scripts/[id]/visibility/route.ts:49` — Discover publish gate (we added)
- `src/app/api/scripts/[id]/privacy/route.ts:122`
- `src/app/api/scripts/[id]/download/route.ts:95`
- `src/app/api/consideration/create-draft/route.ts:30`
- `src/app/api/consideration/submit/route.ts:55,86`
- `src/app/api/consideration/update/route.ts:79`
- `src/app/api/consideration/apply/route.ts:46`

### 2d. Matching (open to everyone)
- `src/lib/matching.ts:270,430` — currently only matches Pro writers' scripts to producers. Route through `isPro()` so all scripts match.

### 2e. Remove the upgrade surfaces
Once `isPro` is true everywhere, upgrade banners/modals/CTAs auto-hide (they render on `!isPro`). Still must explicitly handle:
- **Landing page**: remove the pricing/Pro section entirely (see §4).
- **Stripe checkout entry** (`/api/stripe/checkout`, "Become Pro" buttons): disable so nobody can start a new subscription. (Leave webhook intact to process cancellations.)
- Cosmetic: producer-facing "Pro/Free" badges on writers (`partner/applications`, `review/applications`) — everyone shows "Pro"; remove the badge or leave it, harmless.

### 2f. Keep: scripts PRIVATE by default
Default stays private (creator controls their work — that's the brand). Difference: publishing to Discover is now free for everyone instead of Pro-gated.

### 2g. Verify
Run the build (Vercel will) before the announcement fires. A missed/broken gate = a "free" app that still blocks someone, which undercuts the whole launch.

---

## 3. Billing / Stripe (your hands — money action)
- **Cancel all active subscriptions** so real people stop being billed. Method: Stripe dashboard, or a script I write + you run.
- **No refunds needed** (they keep full access, it's free now) — optional goodwill note in the announcement. Your call.
- **Disable new subscribes** (see 2e).
- This fires at the SAME moment as the announcement (don't announce "free" while still charging anyone).

---

## 4. Landing page
- Remove pricing / Pro / "$20/mo" everywhere.
- Tell the story: **"The studio you can access."** Open to every creator, neutral to every buyer, the place that finds and de-risks what's worth making.
- Can reference: we run a network of social channels + industry relationships; send us your work, we'll consider it.
- Copy rules: no "AI", no marketing-speak, plain literal language (you'll do the final word-level pass).

---

## 5. The announcement (fires with the cancellation)
- **Public post** (your channels): GEM is free, here's the bigger vision.
- **Email to existing subscribers**: you're no longer billed; thank you; here's why we did it / the bigger dream.
- Honest + bold, not fabricated (don't claim a fund/deals you don't have).

---

## 6. The "why are you free / who are you" trust problem
Free can read as sketchy. Pre-empt it by making free a *strength*, not a discount:
- **Reframe:** "We don't charge writers because our business is finding and backing the great ones — we make money when you win, not by charging you." That's MORE trustworthy than a paywall.
- **Legitimacy markers:** team/adviser pedigree (Disney, Apple, Spotify, Tesla, TikTok, Deloitte — framed as "where we come from," NOT "partnered with"), real industry relationships, the studio framing.
- **Product quality is the proof:** a genuinely great free eval is the viral hook ("this is free and Black List charges hundreds??"). The product IS the marketing.

---

## 7. Order of operations
1. Build the free product (FREE_MODE) → **verify build** → deploy.
2. Update landing page → deploy.
3. Finalize announcement copy (you approve).
4. Prep the dual script: cancel all subs + send announcement.
5. **FIRE:** run the dual script — billing off + announcement out — with the free product + new landing already live.

---

## 8. Risks / watch-items
- Build break from the sweep → verify before firing.
- Anyone mid-charge / proration confusion → cancellation note handles it.
- "Free = not serious" perception → §6 messaging is the answer.
- Losing ~$900/mo → accepted; immaterial vs. the upside.
- Reversibility → code flips back via `FREE_MODE`; the *announcement* doesn't un-send, so be sure before §7 step 5.

---

## 9. NOT doing now (scope guard)
No new monetization, no fund/deal mechanics, no B2B industry product yet. Tonight's scope is exactly: free product + story + own the funnel. Everything else is the next chapter.

---

## Decisions needed from you before we build
1. **Cancellation method:** Stripe dashboard yourself, or a script I write + you run?
2. **Refunds:** none (keep access free) — confirm, or do you want a goodwill gesture?
3. **Scope confirm:** are considerations / peer reviews / downloads ALL free too, or keep any of them gated? (Default in this plan: everything free.)
4. **Private-by-default:** keep (recommended), or default scripts public now that publishing is free?
