# GEM — AI Script Evaluation Platform

> **IMPORTANT FOR ALL AGENTS/SESSIONS**: This file is the single source of truth for the GEM codebase. Read it fully before making any changes. If your work changes architecture, adds/removes pages or components, modifies user flows, adds DB tables, or changes key conventions — **update this file before you finish**. Add a dated entry to the changelog at the bottom.

## What this is

GEM is a $20/month SaaS that gives screenwriters professional-grade script evaluations. Upload a PDF screenplay, get a scored report in under a minute with five weighted dimensions, development notes, production analysis, and a tier placement. Writers can make their scripts public on a Discover leaderboard.

Live at: https://gem-pilot.vercel.app

## Stack

- **Framework**: Next.js 16.2.1 + React 19 (App Router, server components by default)
- **Auth & DB**: Supabase (auth, Postgres, RLS, storage)
- **Payments**: Stripe Checkout + Webhooks ($20/mo, 1 free eval before paywall, promo codes enabled)
- **AI**: OpenAI GPT-5.4 Mini for script evaluation (~$0.027/script)
- **Deploy**: Vercel (auto-deploy on push to `main`)
- **Styling**: Tailwind 4 + CSS custom properties (--gem-*)
- **Analytics**: PostHog (events, funnels, A/B testing, session replay, feature flags)

## Key architecture decisions

- **Supabase 1-to-1 joins return objects, not arrays.** The `script_evaluations` table has a unique constraint on `submission_id`, so Supabase returns it as an object when joined. Always handle both: `Array.isArray(raw) ? raw[0] : raw`.
- **Service role client** is used for writes in API routes (evaluate, stripe webhook) to bypass RLS. Browser client uses anon key.
- **`useSearchParams()` needs Suspense** in Next.js 16. Any client component using it must be wrapped.
- **Env vars**: Secrets (Stripe, OpenAI, Supabase service role) are set in Vercel only, never committed. `.env.local` has public keys and placeholder comments.
- **Auth gating**: Only `/dashboard` is protected by middleware. `/submit`, `/report/[id]`, `/discover` are all public. Like buttons redirect logged-out users to `/login?redirect=...`.
- **Client-side file passing**: `src/lib/pending-file.ts` stores a File object in a module-level variable to pass from hero upload → submit page across client-side navigation.
- **PostHog is gracefully degraded**: If `NEXT_PUBLIC_POSTHOG_KEY` is not set, all tracking calls are no-ops (no errors).

## Project structure

```
src/
  app/
    page.tsx              # Landing page (public, server component with client islands)
    dashboard/page.tsx    # User's submissions with scores (auth required)
    discover/page.tsx     # Public leaderboard (server component, no auth)
    submit/page.tsx       # Upload + evaluate flow (3 states: upload/signup/evaluating)
    report/[id]/page.tsx  # Full evaluation report (public, like requires login)
    login/page.tsx        # Auth (supports ?redirect= param)
    signup/page.tsx       # Auth
    auth/callback/        # Supabase auth callback
    api/
      evaluate/           # POST: upload PDF, run GPT eval, store results
      scripts/[id]/like/  # POST: toggle like
      scripts/[id]/visibility/  # PATCH: toggle public/private
      stripe/checkout/    # POST: create Stripe checkout session (allow_promotion_codes: true)
      stripe/webhook/     # POST: handle Stripe events
      stripe/portal/      # POST: create billing portal session
  components/
    nav.tsx               # Main nav with mobile hamburger menu
    hero-upload.tsx       # Landing page file drop zone
    report-showcase.tsx   # Interactive GoT report demo for landing page
    track-section.tsx     # Section visibility tracker (fires section_viewed)
    tracked-cta.tsx       # CTA click tracker (fires cta_clicked with location/label)
    landing-tracking.tsx  # Landing page view event
    landing-experiments.tsx # PostHog feature flag text swaps (data-experiment attributes)
    posthog-provider.tsx  # PostHog init + SPA pageview tracking
    report/               # Report page components (score-card, like-button, visibility-toggle, upgrade-banner, etc.)
    discover/             # Discover page components (script-grid, search-bar)
    ui/                   # Shared UI (score-ring, paywall-modal)
  lib/
    supabase-server.ts    # Server-side Supabase client (service role)
    supabase-browser.ts   # Client-side Supabase client (anon key)
    stripe.ts             # Stripe instance
    posthog.ts            # PostHog init + named conversion events
    pending-file.ts       # Client-side file store for hero → submit handoff
    evaluation-prompt.ts  # GPT evaluation system prompt and rubric
  types/index.ts          # All TypeScript types, tier system, dimension weights
  middleware.ts           # Auth guard for /dashboard only
  data/sample-reports.ts  # Hardcoded GoT evaluation for landing page showcase
```

## Supabase tables

- `profiles` — `id`, `full_name`, `avatar_url`, `stripe_customer_id`, `subscription_status`, `free_eval_used`, `created_at`
- `script_submissions` — `id`, `user_id`, `title`, `filename`, `file_url`, `file_size`, `status`, `is_public`, `error_message`, `created_at`
- `script_evaluations` — `id`, `submission_id` (unique), `weighted_score`, `tier`, `evaluation` (JSONB), `model`, `input_tokens`, `output_tokens`, `cost_usd`, `created_at`
- `script_likes` — `id`, `evaluation_id`, `user_id`, `created_at`
- `leaderboard` — Postgres VIEW joining public submissions + evaluations + profiles + like counts

## User flows

1. **Landing → hero upload → inline signup → free eval → report** (primary conversion path)
2. **Landing → signup button → submit page → free eval → report** (direct signup path)
3. **Returning free user → submit → upgrade gate → Stripe checkout → submit** (monetization)
4. **Report page → 60s timed upgrade banner → Stripe checkout** (monetization)
5. **Subscriber → dashboard → submit → report (unlimited)**
6. **Anyone → discover page → click script → report page → like (requires login)**

## Analytics (PostHog)

Conversion funnel events tracked in `src/lib/posthog.ts`:
```
landing_page_viewed → section_viewed(hero|showcase|leaderboard|how_it_works|pricing|bottom_cta)
  → cta_clicked(location, label) → hero_file_uploaded → signup_started → signup_completed
  → evaluation_started → evaluation_completed → upgrade_prompt_shown → subscribe_clicked
  → subscription_activated → script_published
```

PostHog also auto-captures clicks and pageviews. Feature flags and A/B testing are available for autoresearch-style experimentation.

Env vars: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

## A/B Testing (autoresearch-style)

Landing page elements with `data-experiment="flag-name"` can have their text swapped via PostHog feature flag payloads — no deploy needed. See `EXPERIMENTS.md` for the full framework, experiment queue, and measurement methodology. Key components:
- `TrackSection` — fires `section_viewed` when a section is 50%+ visible for 1 second
- `TrackedCTA` — fires `cta_clicked` with location/label on every CTA click
- `LandingExperiments` — reads PostHog feature flags and applies text overrides

Currently tagged for experiments: `<h1 data-experiment="hero-headline">`, `<p data-experiment="hero-subhead">`

## Stale code (to clean up)

Old pages from the pre-pivot producer SaaS version still exist but are not linked in nav:
`/messages`, `/projects`, `/projects/new`, `/projects/[id]`, `/profile/edit`, `/creators/[id]`, `/discover/search`, `/onboarding`

## Commands

```bash
npm run dev          # Local dev server on :3000
npm run build        # Production build
npx tsc --noEmit     # Type check (ignore .next/dev/types/validator.ts errors — stale cache)
git push origin main # Deploys to Vercel automatically
```

## Useful Supabase queries

```sql
-- All users with email, subscription status, submission count
select p.id, p.full_name, u.email, p.subscription_status, p.free_eval_used, p.created_at,
       count(s.id) as total_submissions
from profiles p
join auth.users u on u.id = p.id
left join script_submissions s on s.user_id = p.id
group by p.id, p.full_name, u.email, p.subscription_status, p.free_eval_used, p.created_at
order by p.created_at desc;
```

## Changelog

- **2026-04-01**: Landing page revamp (GoT showcase, hero upload, dual value prop), inline signup flow, upgrade prompts (timed banner + submit gate), Calendly CTAs, Stripe promo codes, public leaderboard/reports, mobile responsiveness, PostHog analytics + A/B testing framework, EXPERIMENTS.md
