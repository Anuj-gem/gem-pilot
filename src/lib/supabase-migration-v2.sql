-- GEM V2 Migration — Submissions + Comments
-- Run this in the Supabase SQL editor

-- ─── Submissions ─────────────────────────────────────────────────────────────
-- Stores rich submission metadata and review status.
-- The AI report lives in the FastAPI backend; status here controls writer visibility.

create table if not exists public.gem_submissions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  show_id      text not null,
  title        text,
  pitch        text,
  season_plan  text,
  casting_vision text,
  imdb_url     text,
  collaborators jsonb not null default '[]'::jsonb,
  concept_image_urls text[] not null default '{}',
  status       text not null default 'pending_review'
                 check (status in ('pending_review', 'published')),
  admin_notes  text,         -- Anuj's private notes, never shown to writers
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.gem_submissions enable row level security;

-- Writers can read their own submissions
create policy "Writers read own submissions"
  on public.gem_submissions for select
  using (auth.uid() = user_id);

-- Writers can insert their own submissions
create policy "Writers insert own submissions"
  on public.gem_submissions for insert
  with check (auth.uid() = user_id);

-- Service role bypasses RLS automatically (used for admin publish)

create index idx_gem_submissions_user_id  on public.gem_submissions(user_id);
create index idx_gem_submissions_show_id  on public.gem_submissions(show_id);
create index idx_gem_submissions_status   on public.gem_submissions(status);
create index idx_gem_submissions_created  on public.gem_submissions(created_at desc);


-- ─── Comments ────────────────────────────────────────────────────────────────
-- Threaded discussion between writers and the GEM team.

create table if not exists public.gem_comments (
  id           uuid primary key default gen_random_uuid(),
  show_id      text not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  author_name  text,         -- denormalized for display
  is_gem_team  boolean not null default false,
  body         text not null,
  created_at   timestamptz not null default now()
);

alter table public.gem_comments enable row level security;

-- Writers can read comments on any submission they own
create policy "Writers read comments on own submissions"
  on public.gem_comments for select
  using (
    exists (
      select 1 from public.gem_submissions s
      where s.show_id = gem_comments.show_id
        and s.user_id = auth.uid()
    )
  );

-- Writers can insert non-team comments on their own submissions
create policy "Writers insert own comments"
  on public.gem_comments for insert
  with check (
    auth.uid() = user_id
    and is_gem_team = false
    and exists (
      select 1 from public.gem_submissions s
      where s.show_id = gem_comments.show_id
        and s.user_id = auth.uid()
    )
  );

create index idx_gem_comments_show_id   on public.gem_comments(show_id);
create index idx_gem_comments_created   on public.gem_comments(created_at asc);


-- ─── Concept Images Storage Bucket ───────────────────────────────────────────
-- Run this separately in Supabase Storage settings, or via dashboard:
--   Bucket name: concept-images
--   Public: false
--   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--   Max file size: 10MB

-- Storage policy (run after creating the bucket):
-- insert into storage.buckets (id, name, public) values ('concept-images', 'concept-images', false);

-- create policy "Authenticated users can upload concept images"
--   on storage.objects for insert
--   with check (bucket_id = 'concept-images' and auth.role() = 'authenticated');

-- create policy "Users can read own concept images"
--   on storage.objects for select
--   using (bucket_id = 'concept-images' and auth.uid()::text = (storage.foldername(name))[1]);
