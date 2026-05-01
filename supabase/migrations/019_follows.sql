-- Follows v0.4 (Anuj 2026-04-29) — writer-to-writer follow relationship.
create table if not exists public.follows (
  id          uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint follows_no_self check (follower_id <> followee_id)
);
create unique index if not exists follows_unique on public.follows(follower_id, followee_id);
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_followee_idx on public.follows(followee_id);
alter table public.follows enable row level security;
create policy "anyone can read follows" on public.follows for select using (true);
create policy "users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "users can unfollow others" on public.follows for delete using (auth.uid() = follower_id);
