-- ============================================
-- SCRIPT SUBMISSIONS
-- ============================================
create table public.script_submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  filename text not null,
  file_url text, -- Supabase Storage path
  file_size integer,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz default now()
);

alter table public.script_submissions enable row level security;

-- Users can view their own submissions
create policy "Users can view own submissions" on public.script_submissions
  for select using (auth.uid() = user_id);

-- Users can create submissions
create policy "Users can create submissions" on public.script_submissions
  for insert with check (auth.uid() = user_id);

-- Users can update their own submissions (for status changes via service role)
create policy "Users can update own submissions" on public.script_submissions
  for update using (auth.uid() = user_id);

-- ============================================
-- SCRIPT EVALUATIONS (full report)
-- ============================================
create table public.script_evaluations (
  id uuid default uuid_generate_v4() primary key,
  submission_id uuid references public.script_submissions(id) on delete cascade not null unique,
  weighted_score numeric(5,2),
  tier text check (tier in ('Exceptional', 'Strong', 'Promising', 'Early Stage', 'Needs Fundamental Rework')),
  evaluation jsonb not null, -- full GPT response (format_detection, scores, development_assessment, production_reality)
  model text default 'gpt-5.4-mini',
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,6),
  created_at timestamptz default now()
);

alter table public.script_evaluations enable row level security;

-- Users can view evaluations for their submissions
create policy "Users can view own evaluations" on public.script_evaluations
  for select using (
    submission_id in (select id from public.script_submissions where user_id = auth.uid())
  );

-- Service role inserts evaluations (no user insert policy needed)
-- API routes use service role key for writes

-- ============================================
-- STORAGE BUCKET for script PDFs
-- ============================================
-- Run this separately in Supabase dashboard or via:
-- insert into storage.buckets (id, name, public) values ('scripts', 'scripts', false);
--
-- Storage policies:
-- create policy "Users can upload scripts" on storage.objects
--   for insert with check (bucket_id = 'scripts' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users can read own scripts" on storage.objects
--   for select using (bucket_id = 'scripts' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- LEADERBOARD VIEW (public scores, anonymized)
-- ============================================
create or replace view public.leaderboard as
  select
    e.id as evaluation_id,
    s.id as submission_id,
    s.title,
    s.user_id,
    p.full_name as author_name,
    e.weighted_score,
    e.tier,
    (e.evaluation->'format_detection'->>'format') as format,
    (e.evaluation->'format_detection'->>'genre_primary') as genre,
    e.created_at
  from public.script_evaluations e
  join public.script_submissions s on e.submission_id = s.id
  join public.profiles p on s.user_id = p.id
  where s.status = 'completed'
  order by e.weighted_score desc;
