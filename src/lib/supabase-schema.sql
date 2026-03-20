-- GEM V1 Database Schema for Supabase
-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Users (extends Supabase auth.users) ────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  subscription_status text not null default 'none'
    check (subscription_status in ('trialing', 'active', 'canceled', 'past_due', 'none')),
  stripe_customer_id text unique,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ─── Scripts ─────────────────────────────────────────────────────────
create table public.scripts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  filename text not null,
  file_size integer not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.scripts enable row level security;

create policy "Users can read own scripts"
  on public.scripts for select using (auth.uid() = user_id);

create policy "Users can insert own scripts"
  on public.scripts for insert with check (auth.uid() = user_id);

-- ─── Analysis Jobs ───────────────────────────────────────────────────
create table public.analysis_jobs (
  id uuid primary key default uuid_generate_v4(),
  script_id uuid references public.scripts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.analysis_jobs enable row level security;

create policy "Users can read own jobs"
  on public.analysis_jobs for select using (auth.uid() = user_id);

-- ─── Analysis Reports ────────────────────────────────────────────────
create table public.analysis_reports (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.analysis_jobs(id) on delete cascade unique not null,
  script_id uuid references public.scripts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  overall_score integer not null check (overall_score between 1 and 100),
  verdict text not null check (verdict in ('pass', 'consider', 'develop', 'prioritize')),
  facet_scores jsonb not null, -- FacetScore[]
  strengths jsonb not null,    -- string[]
  weaknesses jsonb not null,   -- string[]
  summary text not null,
  created_at timestamptz not null default now()
);

alter table public.analysis_reports enable row level security;

create policy "Users can read own reports"
  on public.analysis_reports for select using (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────
create index idx_scripts_user_id on public.scripts(user_id);
create index idx_jobs_user_id on public.analysis_jobs(user_id);
create index idx_jobs_script_id on public.analysis_jobs(script_id);
create index idx_reports_user_id on public.analysis_reports(user_id);
create index idx_reports_script_id on public.analysis_reports(script_id);

-- ─── Auto-create profile on signup ───────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, subscription_status, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', null),
    'trialing',
    now() + interval '7 days'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
