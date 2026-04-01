# GEM — AI Script Evaluation Platform

## What this is

GEM is a $20/month SaaS that gives screenwriters professional-grade script evaluations. Upload a PDF screenplay, get a scored report in under a minute with five weighted dimensions, development notes, production analysis, and a tier placement. Writers can make their scripts public on a Discover leaderboard.

Live at: https://gem-pilot.vercel.app

## Stack

- **Framework**: Next.js 16.2.1 + React 19 (App Router, server components by default)
- **Auth & DB**: Supabase (auth, Postgres, RLS, storage)
- **Payments**: Stripe Checkout + Webhooks ($20/mo, 1 free eval before paywall)
- **AI**: OpenAI GPT-5.4 Mini for script evaluation (~$0.027/script)
- **Deploy**: Vercel (auto-deploy on push to `main`)
- **Styling**: CSS custom properties (--gem-*), no Tailwind

## Key architecture decisions

- **Supabase 1-to-1 joins return objects, not arrays.** The `script_evaluations` table has a unique constraint on `submission_id`, so Supabase returns it as an object when joined. Always handle both: `Array.isArray(raw) ? raw[0] : raw`.
- **Service role client** is used for writes in API routes (evaluate, stripe webhook) to bypass RLS. Browser client uses anon key.
- **`useSearchParams()` needs Suspense** in Next.js 16. Any client component using it must be wrapped.
- **Env vars**: Secrets (Stripe, OpenAI, Supabase service role) are set in Vercel only, never committed. `.env.local` has public keys and placeholder comments.

## Project structure

```
src/
  app/
    page.tsx              # Landing page (public)
    dashboard/page.tsx    # User's submissions with scores
    discover/page.tsx     # Public leaderboard (server component)
    submit/page.tsx       # Upload + evaluate flow
    report/[id]/page.tsx  # Full evaluation report
    login/page.tsx        # Auth
    signup/page.tsx       # Auth
    api/
      evaluate/           # POST: upload PDF, run GPT eval, store results
      scripts/[id]/like/  # POST: toggle like
      scripts/[id]/visibility/  # PATCH: toggle public/private
      stripe/checkout/    # POST: create Stripe checkout session
      stripe/webhook/     # POST: handle Stripe events
      stripe/portal/      # POST: create billing portal session
  components/
    nav.tsx               # Main nav (Dashboard, Discover, Submit)
    report/               # Report page components (score-card, like-button, visibility-toggle, etc.)
    discover/             # Discover page components (script-grid, search-bar)
    ui/                   # Shared UI (score-ring, paywall-modal)
  lib/
    supabase-server.ts    # Server-side Supabase client
    supabase-browser.ts   # Client-side Supabase client
    stripe.ts             # Stripe instance
  types/index.ts          # All TypeScript types, tier system, dimension weights
  middleware.ts           # Auth guard for /dashboard, /submit, /report, /onboarding
```

## Supabase tables

- `profiles` — user info + `stripe_customer_id`, `subscription_status`, `free_eval_used`
- `script_submissions` — uploaded scripts with `is_public` flag
- `script_evaluations` — GPT evaluation results (1-to-1 with submissions via unique constraint)
- `script_likes` — user likes on evaluations
- `leaderboard` — Postgres VIEW joining public submissions + evaluations + profiles + like counts

## User flows

1. **New visitor**: Landing page -> Sign up -> Submit script (free first eval) -> View report
2. **Returning free user**: Dashboard -> Submit -> Paywall modal -> Stripe checkout -> Submit
3. **Subscriber**: Dashboard -> Submit -> Report (unlimited)
4. **Discovery**: Discover page -> Search/filter -> Click script -> Report page -> Like

## Stale code (to clean up)

Old pages from the pre-pivot producer SaaS version still exist but are not linked in nav:
`/messages`, `/projects`, `/projects/new`, `/projects/[id]`, `/profile/edit`, `/creators/[id]`, `/discover/search`

## Commands

```bash
npm run dev          # Local dev server on :3000
npm run build        # Production build
git push origin main # Deploys to Vercel automatically
```
