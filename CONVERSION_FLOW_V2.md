# GEM Conversion Flow V2 — Blurred Report Paywall

> **Date:** April 2, 2026
> **Status:** Scoped, pending implementation
> **Owner:** Anuj Kommareddy

---

## Summary

Replace the current signup-gated free eval with a **blurred report paywall**. Users can upload and evaluate scripts freely, but only see the score and tier — the full report (comparables, overall take, development notes, production reality) is blurred behind a $20/mo subscription. This becomes the single conversion surface for all users regardless of device or entry point.

## Why

PostHog data (30-day window, April 2026) shows:

- **81 unique visitors → 4 signups → 2 subscribers.** 95% of visitors never experience the product because signup is in the way.
- **100% of signups evaluate.** Once someone is in, the product hooks them.
- **The product loop is addictive.** One subscriber did 13 evals in 40 minutes after paying. Three gifted users did 38, 13, and 9 evals respectively.
- **Mobile traffic is high (33 unique) but doesn't convert** — 0 mobile subscribe clicks. Desktop drives all revenue.
- **The report is the best salesperson.** Moving the "wow moment" before payment is the highest-leverage change available.

## User Flows

### Desktop Flow

```
Landing page (hero upload) → Upload PDF (no signup required)
  → Evaluation runs
  → Blurred report page:
      - Score + Tier visible at top
      - Section headers visible (Comparables, Overall Take, etc.)
      - Section content blurred with subscribe overlay
  → "Subscribe to see full report — $20/mo" CTA
  → Stripe checkout → Account creation
  → Full report unlocked
  → Dashboard → Unlimited evals
```

### Mobile Flow

```
Landing page (signup CTA, no file upload) → Create account (free)
  → Dashboard (browse leaderboard, get engaged)
  → Eventually submit script (mobile or desktop)
  → Blurred report (same as desktop)
  → "Subscribe — $20/mo" CTA
  → Stripe checkout
  → Full report unlocked
  → Dashboard → Unlimited evals
```

### Key Insight

Both flows converge at the **blurred report**. The paywall is always at the report level, never at signup. Mobile signup is free and frictionless — it just gets people into the ecosystem. The conversion moment happens when a user is staring at their own score and can see the section headers promising to explain it.

## Access Tiers

| Tier | Can upload | Can evaluate | Can see score/tier | Can see full report | Can publish to leaderboard |
|------|-----------|-------------|-------------------|--------------------|-----------------------------|
| Anonymous (desktop only) | Yes | Yes (rate limited) | Yes | No (blurred) | No |
| Free account | Yes | Yes (rate limited) | Yes | No (blurred) | No |
| Subscriber ($20/mo) | Yes | Yes (unlimited) | Yes | Yes | Yes |

**Leaderboard publishing is subscriber-only.** Free users can browse the leaderboard and see other scripts' scores, but cannot publish their own. This is the final layer of the tease: see your score → want the full breakdown → subscribe → get the report → want to compete → publish to leaderboard. Every step deepens engagement and reinforces the subscription value.

Rate limit for non-subscribers: **5 evals per IP per 24 hours.** Generous enough for real users exploring the product, annoying enough to deter abuse. Each eval costs ~$0.50 in OpenAI API, so 5 free evals = $2.50 max exposure per IP per day.

## What Gets Blurred

The report page currently has these sections:

| Section | Blurred? | Rationale |
|---------|----------|-----------|
| Score + Tier badge | **Visible** | The hook — shows them the number, creates curiosity |
| Format / Genre / Tone tags | **Visible** | Low-value metadata, helps them trust the system understood their script |
| Comparables | **Blurred** | High value — "what's my script similar to?" is irresistible |
| Overall Take | **Blurred** | The headline assessment — strongest conversion driver |
| Score Card (5 dimensions) | **Blurred** | Shows dimension names but not scores — creates "where did I lose points?" curiosity |
| Development Assessment | **Blurred** | The detailed notes writers crave |
| Production Reality | **Blurred** | Budget/platform analysis — unique to GEM |

The blur is CSS-only (`filter: blur(8px)` + overlay). No content is hidden from the DOM — this is a conversion mechanism, not a security boundary. Determined users could inspect the DOM, but the friction is enough.

## Technical Changes

### 1. Database Migration (`005_blurred_paywall.sql`)

```sql
-- Support anonymous submissions (no user_id)
ALTER TABLE public.script_submissions
  ALTER COLUMN user_id DROP NOT NULL;

-- Track anonymous eval source IP for rate limiting
ALTER TABLE public.script_submissions
  ADD COLUMN IF NOT EXISTS submitted_by_ip text;

-- Index for rate limiting lookups
CREATE INDEX IF NOT EXISTS idx_submissions_ip_created
  ON public.script_submissions (submitted_by_ip, created_at)
  WHERE submitted_by_ip IS NOT NULL;
```

No changes to profiles or trial_ends_at — the trial system is being replaced by a straight subscription model.

### 2. Evaluate API (`src/app/api/evaluate/route.ts`)

**Authentication becomes optional:**
- If user is authenticated + subscribed: evaluate, no limits
- If user is authenticated + not subscribed: evaluate, rate limited (5/IP/24hr)
- If user is anonymous: evaluate, rate limited (5/IP/24hr), `user_id` is null

**Rate limiting logic:**
```
Get client IP from x-forwarded-for or x-real-ip
Count submissions with this IP in last 24 hours
If >= 5, return 429 with message
```

**Response adds `is_subscriber` flag** so report page knows whether to blur.

### 3. Report Page (`src/app/report/[id]/page.tsx`)

**New blurred report component.** The page fetches the evaluation as before, but rendering depends on subscription status:

- **Subscribed:** Full report (no change from current)
- **Not subscribed (or anonymous):** Score/tier visible at top, all content sections render with `blur(8px)` CSS filter + a subscribe overlay

**Subscribe overlay on blurred sections:**
- Fixed/sticky CTA: "See your full evaluation — $20/mo"
- Links to Stripe checkout (if logged in) or signup page (if anonymous)
- After successful subscription, redirect back to same report URL — now fully visible

### 4. Landing Page (`src/app/page.tsx`)

**Desktop hero (no change to component, change to copy):**
- Keep existing file upload drop zone
- Update copy: "Upload your screenplay. See how it scores." (no mention of signup or trial)
- Remove all trial/free-eval language

**Mobile hero:**
- Button: "Create free account" (simple signup, no CC)
- Helper text: "Free to join. Upload your script and see your score."
- Routes to `/signup`

**Pricing section:**
- Remove trial language entirely
- "$20/month — unlimited full evaluations, leaderboard access"
- Position as: "See your score free. Subscribe for the full picture."

**Remove or update:**
- All "48-hour trial" copy
- All "no credit card required" copy
- All "first evaluation free" copy

### 5. Signup Page (`src/app/signup/page.tsx`)

**Simplified:** Just account creation (email + password or OAuth). No CC collection. No Stripe redirect. Free signup gets you into the dashboard where you can submit scripts and see blurred reports.

### 6. Submit Page (`src/app/submit/page.tsx`)

**Allow anonymous submissions (desktop hero flow):**
- If user is not logged in, still allow form submission
- On eval completion, redirect to `/report/[id]` (blurred)
- Submit page shows rate limit status for non-subscribers

**Remove paywall gate on submit page** — the paywall moves to the report page. Anyone can submit; only the report viewing is gated.

### 7. Stripe Checkout (`src/app/api/stripe/checkout/route.ts`)

**Simplify:** Remove trial_period_days logic. Straight $20/mo subscription. The current checkout flow mostly works as-is.

**Add redirect URL:** After successful checkout, redirect to the report that triggered the purchase (pass `report_id` as metadata through checkout).

### 8. Hero Upload Component (`src/components/hero-upload.tsx`)

**Change redirect behavior:**
- Currently: Upload → redirect to `/submit?from=hero` (requires auth)
- New: Upload → submit to evaluate API directly (no auth check) → redirect to `/report/[id]`

This may require reworking the component to handle the full upload + evaluate flow inline, or creating an intermediate processing page.

### 9. Paywall Modal + Upgrade Banner

**Paywall modal (`src/components/ui/paywall-modal.tsx`):**
- Remove trial language
- Update to: "Subscribe to unlock your full evaluation — $20/mo"
- Used on blurred report page as the overlay CTA

**Upgrade banner (`src/components/report/upgrade-banner.tsx`):**
- May be replaced by the blurred section overlay
- Or kept as a secondary nudge on report page

### 10. PostHog Tracking (`src/lib/posthog.ts`)

**New events:**
- `anonymous_eval_completed` — score, tier, IP hash
- `blurred_report_viewed` — evaluation_id, score, device
- `subscribe_from_report_clicked` — evaluation_id, score (critical: ties conversion to score)
- `report_unlocked` — evaluation_id (user subscribed and is now viewing full report)

**Updated funnel:**
```
Desktop:  hero_upload → eval_completed → blurred_report_viewed → subscribe_clicked → subscription_activated → report_unlocked
Mobile:   signup_completed → eval_completed → blurred_report_viewed → subscribe_clicked → subscription_activated → report_unlocked
```

## Files to Change

| File | Change |
|------|--------|
| `supabase/migrations/005_blurred_paywall.sql` | **New.** user_id nullable, IP column, rate limit index |
| `src/app/api/evaluate/route.ts` | Auth optional, rate limiting, anonymous submissions |
| `src/app/report/[id]/page.tsx` | Blurred sections for non-subscribers, subscribe overlay |
| `src/app/page.tsx` | Copy updates, remove trial language |
| `src/app/submit/page.tsx` | Remove paywall gate, allow anonymous, redirect to report |
| `src/app/signup/page.tsx` | Simplify to just account creation |
| `src/components/hero-upload.tsx` | Direct eval flow without auth requirement |
| `src/components/ui/paywall-modal.tsx` | Update copy, remove trial language |
| `src/components/report/upgrade-banner.tsx` | Update or replace with blur overlay |
| `src/lib/posthog.ts` | New funnel events |
| `src/app/api/stripe/checkout/route.ts` | Remove trial logic, add report redirect |
| `src/app/api/stripe/webhook/route.ts` | Simplify (no trial period handling needed) |

## Files to Remove or Deprecate

| File | Action |
|------|--------|
| `supabase/migrations/004_trial_period.sql` | **Revert or supersede.** Trial system replaced by blurred paywall. |
| Trial-related code in submit/page.tsx | Remove `trialEndsAt`, `hasActiveTrial`, `getTrialTimeLeft()` |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Anonymous evals cost money (OpenAI API) | ~$0.50/eval, up to $2.50/IP/day | 5/IP rate limit caps exposure; if 10% convert at $20/mo, ROI is 4x+ |
| DOM inspection reveals blurred content | Technically savvy users bypass paywall | CSS blur is conversion UX, not DRM. Acceptable risk at current scale. |
| Shared IP networks hit rate limit (coffee shops) | Legitimate users blocked | 5/day is generous; can add Turnstile CAPTCHA as alternative if this becomes an issue |
| Mobile users have extra step vs desktop | Slightly longer conversion path | Mobile signup is free and fast; blurred report paywall is the same for everyone |
| Score disagreement drives negative sentiment | Users pay to see "why" and feel angry | Report quality is strong (38-eval power user validates this). Disagreement = engagement. |
| Removing trial may reduce initial signups | Less commitment but less conversion | Can A/B test: blurred-paywall vs 7-day-trial. PostHog experiment framework supports this. |

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Landing → evaluation | ~6% (5/81) | 20%+ (removing signup barrier) |
| Evaluation → subscribe | ~40% (2/5) | Maintain 30%+ with higher volume |
| Overall landing → subscribe | ~2.5% (2/81) | 6%+ |
| Anonymous evals per day | 0 | 5-15 (healthy interest) |
| Blurred report → subscribe click rate | N/A | 15%+ |

## Implementation Sequence

### Phase 1: Database + API (Day 1)
1. Write and apply migration `005_blurred_paywall.sql`
2. Update evaluate API for anonymous access + rate limiting
3. Simplify Stripe checkout (remove trial logic)

### Phase 2: Report Page Paywall (Day 2)
4. Build blurred report component
5. Add subscribe overlay CTA
6. Wire up post-checkout redirect back to report

### Phase 3: Landing + Submit + Signup (Day 3)
7. Update landing page copy (remove trial, update CTAs)
8. Update submit page (remove paywall gate, allow anonymous)
9. Update hero-upload for direct eval flow
10. Simplify signup page

### Phase 4: Cleanup + Tracking (Day 4)
11. Remove trial-related code
12. Add PostHog events for new funnel
13. Update paywall modal / upgrade banner copy
14. TypeScript check + deploy

## Resolved Decisions

1. **Leaderboard stays fully visible.** No blur on leaderboard reports. May experiment with this later, but not now — leaderboard shareability and social proof are more valuable than using it as a conversion surface at current scale.

2. **Migration 004 (trial_ends_at column):** Leave in place, stop using it. Migration 005 supersedes the trial system. No cleanup migration needed — dead column does no harm.

3. **Gifted users:** 4 users currently have `subscription_status = 'active'`. 2 are forever-free (Anuj + personal friend who is a real writer). 2 are on 1-month free subscriptions with payment info on file. If the paying users cancel, their leaderboard posts get removed — that's the cost of free access ending.

4. **Rate limiting:** Start with IP-based (5/IP/24hr). Add Turnstile later only if shared-network complaints arise.

## Report Lifecycle and Dashboard Behavior

### Anonymous evals (no account)
- The blurred report exists only for the current browser session
- Close the tab → gone. No way to recover without re-uploading (subject to rate limit)
- The evaluation IS stored in the database (for analytics and in case they sign up later), but there's no UI to access it without an account
- This creates natural urgency: "subscribe now or lose this report"

### Free account, not subscribed
- Dashboard shows a list of their submissions with score/tier visible
- Each report entry shows the score, tier badge, and a "Subscribe to view full report" label instead of a clickable link
- Reports are NOT accessible as blurred previews from the dashboard — the blurred preview only appears immediately after evaluation as a one-time conversion moment
- This keeps the dashboard clean (no cluttered teasers) and makes every entry a gentle conversion nudge
- If they re-submit the same script, they get another blurred preview moment

### Subscribed
- Full access to all past reports, unlimited new evals, leaderboard publishing
- Dashboard shows all submissions with clickable links to full reports

### Cancelled subscriber
- Same as "free account, not subscribed" — loses access to full reports immediately
- Dashboard reverts to score/tier + "Resubscribe to view" labels
- Leaderboard posts remain public (their published reports stay visible to others)
- Their own access to those published reports is gated behind resubscription
