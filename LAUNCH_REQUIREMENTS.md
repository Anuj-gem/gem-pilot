# GEM Launch Requirements

**Goal:** Take the current local-only app live with auth, payments, and production infrastructure.
**Pricing:** $99/month, unlimited scripts, 7-day free trial. Anuj configures Stripe subscription product/price. Code wires it in.

---

## Current State

| Layer | Local Setup | Production Target |
|-------|------------|-------------------|
| Frontend (Next.js) | `localhost:3000` | Vercel |
| Backend (FastAPI) | `localhost:8000` | AWS (ECS Fargate or EC2) |
| Auth | Mock (localStorage) | Supabase Auth |
| Database | JSON files on disk | Supabase Postgres |
| File storage | Local filesystem | AWS S3 |
| Payments | None | Stripe Checkout + Webhooks |
| Domain | None | Custom domain on Vercel |

---

## Service Accounts Needed

You need accounts and credentials from each of these. Some you may already have.

### 1. Supabase
- **Create project** at [supabase.com](https://supabase.com)
- **Grab from Settings → API:**
  - `NEXT_PUBLIC_SUPABASE_URL` — your project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key (safe for client)
  - `SUPABASE_SERVICE_ROLE_KEY` — server-only key (for webhooks/admin)
- **Enable Email Auth** in Authentication → Providers
- Supabase packages already installed in package.json (`@supabase/supabase-js`, `@supabase/ssr`)

### 2. Stripe
- **You handle:** Create a Product + Price ($99/month with 7-day trial) in the Stripe Dashboard
- **Grab from Developers → API Keys:**
  - `STRIPE_SECRET_KEY` — server-only (sk_live_...)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — client-safe (pk_live_...)
  - `STRIPE_PRICE_ID` — the price ID for your $99/month plan (price_...)
- **Set up webhook** endpoint (Stripe Dashboard → Webhooks → Add endpoint):
  - URL: `https://yourdomain.com/api/stripe/webhook`
  - Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
  - Grab: `STRIPE_WEBHOOK_SECRET` (whsec_...)
- Stripe packages already installed (`stripe`, `@stripe/stripe-js`)

### 3. AWS
- **S3 bucket** for script uploads and report storage
  - `AWS_S3_BUCKET` — bucket name
  - `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — IAM user with S3 read/write
  - `AWS_REGION` — e.g., us-east-1
- **ECS Fargate** (recommended) or EC2 for the FastAPI scoring server
  - Needs: Docker container with Python 3.11, autoresearch engine, tesseract, poppler
  - Needs: `OPENAI_API_KEY` as environment secret
  - Needs: S3 access for reading uploads / writing reports
  - Expected memory: 2–4 GB (scoring is LLM-bound, not CPU-bound)
  - Expected time per eval: 30–90 seconds (OpenAI API latency)

### 4. Vercel
- **Connect GitHub repo** → auto-deploy `gem-app/` directory
  - Set root directory to `gem-app` in project settings
- **Environment variables** (add in Vercel Dashboard → Settings → Environment Variables):
  - `GEM_API_URL` — your FastAPI production URL (e.g., `https://api.gem.studio`)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_PRICE_ID`
  - `STRIPE_WEBHOOK_SECRET`

### 5. Domain (optional but recommended)
- Point your domain to Vercel (CNAME or Vercel DNS)
- Optionally set up a subdomain for the API (e.g., `api.gem.studio` → AWS load balancer)

---

## Database Schema (Supabase Postgres)

Three tables needed. Run this SQL in Supabase SQL Editor:

```sql
-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  stripe_customer_id text unique,
  subscription_status text default 'trialing',  -- trialing | active | canceled | past_due
  subscription_id text,
  trial_ends_at timestamptz,
  created_at timestamptz default now()
);

-- Row-level security: users can only read their own profile
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reports (replaces JSON files)
create table public.reports (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  show_id text not null,
  title text,
  report_data jsonb not null,     -- full GEMReport object
  created_at timestamptz default now()
);

alter table public.reports enable row level security;
create policy "Users read own reports" on public.reports
  for select using (auth.uid() = user_id);

create index idx_reports_user on public.reports(user_id);
create unique index idx_reports_user_show on public.reports(user_id, show_id);

-- Jobs (replaces JSON files)
create table public.jobs (
  id uuid primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  show_id text not null,
  filename text,
  file_size integer,
  status text default 'pending',  -- pending | processing | completed | failed
  error text,
  report_id text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.jobs enable row level security;
create policy "Users read own jobs" on public.jobs
  for select using (auth.uid() = user_id);

create index idx_jobs_user on public.jobs(user_id);
```

---

## Code Changes Required

### A. Auth (Supabase) — replace mock login/signup

| File | Change |
|------|--------|
| `src/lib/supabase/client.ts` | **Create:** Supabase browser client singleton |
| `src/lib/supabase/server.ts` | **Create:** Supabase server client (for API routes) |
| `src/middleware.ts` | **Create:** Auth middleware — refresh session, protect `/dashboard`, `/upload`, `/report` |
| `src/app/auth/login/page.tsx` | Replace mock with `supabase.auth.signInWithPassword()` |
| `src/app/auth/signup/page.tsx` | Replace mock with `supabase.auth.signUp()` → redirect to Stripe Checkout |
| `src/app/auth/callback/route.ts` | **Create:** OAuth callback handler (for email confirmation link) |

### B. Stripe — wire checkout + subscription gating

| File | Change |
|------|--------|
| `src/app/api/stripe/checkout/route.ts` | **Create:** Create Stripe Checkout Session (called after signup) |
| `src/app/api/stripe/webhook/route.ts` | **Create:** Handle Stripe webhook events → update `profiles.subscription_status` |
| `src/app/api/stripe/portal/route.ts` | **Create:** Create Stripe Customer Portal session (manage/cancel subscription) |
| `src/app/auth/signup/page.tsx` | After Supabase signup → redirect to Stripe Checkout |
| Upload page + API routes | Check `subscription_status` is `active` or `trialing` before allowing evaluations |

**Signup flow:**
1. User fills signup form → `supabase.auth.signUp()`
2. Supabase creates user + profile (via trigger)
3. Redirect to `/api/stripe/checkout` → creates Stripe Checkout Session with `trial_period_days: 7`
4. Stripe redirects to `/dashboard?success=true` after payment method collected
5. Webhook fires `checkout.session.completed` → we store `stripe_customer_id` and `subscription_id` in profiles

### C. API Routes — add auth + user scoping

| File | Change |
|------|--------|
| All `/api/*` routes | Add Supabase auth check — extract user from session, reject if not authenticated |
| `/api/evaluate/route.ts` | Add subscription check — reject if `subscription_status` not in (`active`, `trialing`) |
| `/api/reports/route.ts` | Scope to user's reports only (filter by `user_id`) |
| `/api/jobs/[id]/route.ts` | Scope to user's jobs only |
| Dashboard page | Fetch only current user's reports |

### D. FastAPI Backend — production readiness

| File | Change |
|------|--------|
| `server/main.py` | CORS: read allowed origins from `ALLOWED_ORIGINS` env var |
| `server/main.py` | Storage: read/write scripts and reports to S3 instead of local disk |
| `server/main.py` | Accept `user_id` param from Next.js API routes (for scoping) |
| `server/main.py` | Add API key auth between Next.js and FastAPI (shared secret, not user-facing) |
| `Dockerfile` | **Create:** Python 3.11 + autoresearch deps + tesseract + poppler |

### E. File Storage — local disk → S3

| Current | Production |
|---------|-----------|
| `autoresearch/data/uploads/{job_id}/` | `s3://gem-uploads/{user_id}/{job_id}/script.pdf` |
| `autoresearch/data/reports/{show_id}.json` | Supabase `reports` table (`report_data` jsonb column) |
| `autoresearch/data/jobs/{job_id}.json` | Supabase `jobs` table |

Score files (`data/scoring/v3_expanded/per_script/`) still live on the FastAPI server filesystem — they're engine internals, not user-facing. The corpus data ships with the Docker image.

---

## Environment Variables Summary

### Vercel (Next.js)
```
GEM_API_URL=https://api.yourdomain.com
GEM_API_SECRET=<shared-secret-between-nextjs-and-fastapi>

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### AWS (FastAPI)
```
OPENAI_API_KEY=sk-proj-...
AWS_S3_BUCKET=gem-uploads
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
GEM_API_SECRET=<same-shared-secret>
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Deployment Order

This is the recommended sequence. Steps 1–3 are account setup (you). Steps 4–8 are code (me).

### You (Account Setup)
1. **Supabase:** Create project, run the SQL schema above, grab API keys
2. **Stripe:** Create Product + Price ($99/mo, 7-day trial), grab API keys, note the Price ID
3. **AWS:** Create S3 bucket, IAM user, and ECS cluster (or EC2 instance)

### Me (Code)
4. **Supabase client + auth** — replace mock auth with real Supabase, create middleware
5. **Stripe wiring** — checkout session, webhook handler, portal, subscription gating
6. **API route auth** — protect all routes, scope data per user
7. **Dockerize FastAPI** — create Dockerfile with autoresearch engine + deps
8. **S3 integration** — swap local file storage for S3 in FastAPI

### Together
9. **Deploy FastAPI** to AWS (push Docker image, set env vars)
10. **Deploy Next.js** to Vercel (connect repo, set env vars)
11. **Wire Stripe webhook** — add production URL in Stripe Dashboard
12. **Domain + DNS** — point domain to Vercel, API subdomain to AWS
13. **Test end-to-end** — signup → checkout → upload → report → portal

---

## Estimated Implementation Time

| Task | Estimate |
|------|----------|
| Supabase auth (replace mock) | 2–3 hours |
| Auth middleware + route protection | 1–2 hours |
| Stripe checkout + webhook + portal | 2–3 hours |
| Subscription gating on upload | 1 hour |
| User-scoped API routes | 2 hours |
| Dockerfile for FastAPI | 1–2 hours |
| S3 integration | 2–3 hours |
| Vercel + AWS deploy config | 1–2 hours |
| End-to-end testing | 2–3 hours |
| **Total** | **~15–20 hours of code work** |

---

## What's NOT in v1 (fast follow-ups)

- Team/org accounts (designed for later)
- Usage analytics / admin dashboard
- Email notifications (report ready, trial ending)
- Custom domain email (noreply@gem.studio)
- Rate limiting / abuse prevention (fair use policy for now)
- Report sharing / public links
- Multiple scoring engine versions
