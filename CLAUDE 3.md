# gem-app — the live product

The Next.js (App Router) web app at `gem.studio` / `gem-pilot.vercel.app`.
Solo-founder PLG SaaS — writers upload scripts, get a producer-grade
evaluation, and (on Pro) get matched with industry partners.

> **For agents/sessions touching this repo:** read this file first, then
> the workspace-level `Selznick_3/CLAUDE.md`. **If you add a new
> top-level concept (route, content type, integration), update this
> file's "File organization" section before you finish.**

## Stack

- Next.js 16 App Router (React Server Components + client islands)
- Supabase (Postgres + RLS + service-role for trusted writes)
- OpenAI gpt-5.4-mini for the eval engine (`/api/evaluate` and
  `scripts/rescore-all.mjs` — both pull from `src/lib/evaluation-prompt.ts`)
- Stripe for subscriptions ($20/mo Pro)
- Postmark for transactional email (templates in dashboard + inline
  HTML/Text via `/email` for ad-hoc sends like producer intros)
- PostHog for product analytics + feature flags
- gtag.js for Google Ads conversion tracking (`src/lib/gtag.ts`)

## File organization

Source layout (`src/` is the Next.js app root):

```
src/
├── app/                      # Routes (App Router)
│   ├── page.tsx              # Landing
│   ├── blog/                 # /blog (index) + /blog/[slug]
│   │                         #   Posts live in /content/blog/*.md (NOT here).
│   ├── writers/              # /writers product page
│   ├── industry/             # /industry product page
│   ├── selznick/             # /selznick engine page
│   ├── apply/                # /apply — industry partner form (emails Anuj)
│   ├── signup/, login/       # Auth (writer-only signup; producers are invite-only)
│   ├── dashboard/            # Writer dashboard
│   ├── partner/              # Producer (industry) dashboard
│   ├── report/[id]/          # Public + owner views of a script report
│   ├── submit/               # Guided submit flow
│   ├── api/                  # Server routes (REST endpoints)
│   ├── sitemap.ts            # Auto-includes /blog posts + sample reports
│   ├── globals.css           # Design tokens + .gem-prose (blog) + print CSS
│   └── layout.tsx
│
├── components/
│   ├── nav.tsx               # SHARED top nav (used by every marketing page)
│   ├── landing/              # Landing-page-specific components
│   ├── dashboard/            # Writer dashboard widgets
│   ├── partner/              # Producer dashboard widgets
│   ├── report/               # Report page widgets (per-section, etc.)
│   └── ui/                   # Reusable primitives (modals, etc.)
│
├── lib/
│   ├── evaluation-prompt.ts  # SOURCE OF TRUTH for the eval prompt
│   ├── blog.ts               # Reads /content/blog/*.md → typed BlogPost[]
│   ├── matching.ts           # Industry matching engine (Pro-gated)
│   ├── report-privacy.ts     # Per-section privacy state shape + helpers
│   ├── supabase-server.ts    # Cookie-aware server client
│   ├── supabase-browser.ts   # Browser client
│   ├── posthog.ts            # PostHog client + named track helpers
│   ├── gtag.ts               # Google Ads conversion + event helpers
│   ├── stripe.ts             # Stripe client
│   └── email.ts              # Postmark template-based send + dedupe
│
└── types/
    └── index.ts              # Shared types — DIMENSION_META lives here
```

Content (markdown that lives outside `src/`):

```
content/
├── blog/                     # Markdown posts. README.md inside explains
│                             # the frontmatter + conventions. Drop a new
│                             # .md file → live at /blog/<slug> next deploy.
└── email-templates/          # Source-of-truth copy for the four Postmark
                              # transactional templates (post_signup,
                              # post_submission_free, post_submission_pro,
                              # post_upgrade). Postmark is the live system;
                              # these files are the canonical copy. Update
                              # both when copy changes. README.md inside
                              # documents the format + variables.
```

### Adding a new top-level concept

When you add something significant — a new route family, a new
integration, a new content directory — update this section. The point
of this file is to keep the map honest as the app grows.

Common patterns:

- **New marketing page**: drop in `src/app/<name>/page.tsx`, mount
  `<Nav />` at the top, follow the `<Section>` pattern from `/writers`
  or `/industry`. Add the URL to `sitemap.ts`. If it deserves nav real
  estate, add to `LEARN_MORE_LINKS` in `src/components/nav.tsx`.
- **New product surface (writer or producer)**: live components go in
  `src/components/dashboard/` or `src/components/partner/`. Page is
  under `src/app/dashboard/` or `src/app/partner/`. API routes that
  back it go under `src/app/api/`.
- **New content type (like blog)**: dedicated folder under `content/`,
  paired with a `src/lib/<type>.ts` lib for reading + a `src/app/<type>/`
  route family. Don't put markdown in `src/`.
- **New integration**: client code in `src/lib/<integration>.ts`,
  webhooks/server actions under `src/app/api/<integration>/`. Env vars
  documented in this file.

## Key conventions

- **Marketing nav**: `src/components/nav.tsx` is the single source of
  truth for the top chrome. Logged-out and logged-in branches both live
  there. Don't fork an inline nav into a page — extend `Nav` instead.
- **Privacy gating**: `src/lib/report-privacy.ts` defines the shape.
  Per-section toggles + score-eye are Pro-only. The Visible/Hidden
  pills render in the actual style but are dimmed at 60% with a tooltip
  for free writers; tap fires a small inline upgrade prompt (not the
  global PaywallModal).
- **Matching (Pro-gated)**: writer's script must have
  `subscription_status='active'` for `createMatchesForSubmission` to
  run. Producer-side reads also filter the candidate set to Pro
  writers. Defense in depth on both sides — see `src/lib/matching.ts`
  and `src/app/partner/page.tsx`.
- **`is_public` defaults**: `false` for free writers (DB default takes
  over since `/api/evaluate`, `/api/score-submission`, and
  `/api/assign-submission` only set `is_public=true` when the owner is
  Pro).
- **Producer signup is invite-only**: `/signup` is writer-only.
  Producers reach `/apply` (form → emails Anuj inline via Postmark
  `/email`, no template). Anuj manually vets and sends a personal
  invite link.
- **Edited fields preserved on rescore**: `script_evaluations.evaluation`
  is overwritten by rescore; `edited_fields` (where user edits like
  the logline live) is never touched. Report UI prefers
  `edited_fields.logline` over `evaluation.positioning_hook`.

## Environment variables (key ones)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (eval engine + rescore script)
- `POSTMARK_SERVER_TOKEN` (transactional email)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_GOOGLE_ADS_ID` (e.g. `AW-18057411275`)

## Scripts (top-level `scripts/`)

- `rescore-all.mjs` — re-score every completed submission with the
  current `evaluation-prompt.ts`. Excludes `@gem.studio` accounts.
  `--dry`, `--concurrency=N`, `--limit=N`, `--use-cache` (resume),
  `--user-id=<uuid>`, `--since=<iso-date>`.
- See script headers for the rest.

## Conventions changelog

- **2026-04-28**: Added `content/email-templates/` — source-of-truth
  copy for the four Postmark transactional templates (`post_signup`,
  `post_submission_free`, `post_submission_pro`, `post_upgrade`). Each
  file holds Subject + HtmlBody + TextBody fenced by HTML comments.
  Postmark itself is the live system; paste from these files when
  updating templates so the repo stays canonical.
- **2026-04-28**: Added `content/blog/` directory + `src/app/blog/`
  routes + `src/lib/blog.ts`. Posts as plain markdown with YAML
  frontmatter; renderer is `react-markdown` + `remark-gfm`.
  `.gem-prose` styles in `globals.css`. Sitemap auto-includes
  published posts. "Blog" added to `Nav` Learn-more dropdown.
- **2026-04-28**: Producer signup moved to invite-only.
  `/signup` is writer-only; `/apply` is the industry application form
  → emails Anuj via Postmark inline (no template).
- **2026-04-28**: Default `is_public=false` for free writers; matching
  Pro-gated on both sides; per-section privacy controls render as
  dimmed real toggles for free users with a small inline upgrade
  prompt instead of a separate Pro pill.
- **2026-04-28**: Shared `Nav` rewritten with logged-out structure
  (Logo · Learn more ▾ · Submit · Sign up · Log in). Landing dropped
  its inline nav onto `Nav`.
