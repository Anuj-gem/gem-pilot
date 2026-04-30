-- Peer reviews v0.1 — community-side reviews on scripts.
--
-- The thesis (Anuj 2026-04-29 strategic shift): GEM is the status platform
-- for screenwriters. Selznick (the AI) provides the trusted-referee score
-- for every script. Peer Reviews layer on top — written by other GEM users
-- (writers, lit reps, producers) who have been granted reviewer permission.
--
-- v0.1 scope is intentionally minimal:
--   - One reviewer (Anuj) seeds Reviews to test the mechanic.
--   - Three fields per Review: score, body, suggestion.
--   - No invite flow, no public profiles, no badges yet — those layer on
--     once the seed loop validates.
--
-- Future migrations will add: invite_reviewer flow, request-to-review,
-- karma/credit system, reviewer status tiers, public reviews on profile.

-- ----------------------------------------------------------------------
-- profiles.is_reviewer — gates access to /review/[script_id]
-- ----------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_reviewer boolean default false not null;

comment on column public.profiles.is_reviewer is
  'When true, this user can review any script in the system via /review/[id]. v0.1: only Anuj. v0.2+: invite-granted or earned.';

-- ----------------------------------------------------------------------
-- peer_reviews — one row per reviewer × script.
-- A given reviewer can only have one active review per script (enforced by
-- unique index). Updates overwrite. Soft delete via deleted_at if needed.
-- ----------------------------------------------------------------------
create table if not exists public.peer_reviews (
  id          uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references public.script_submissions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  score       integer not null check (score >= 0 and score <= 100),
  body        text not null,
  suggestion  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create unique index if not exists peer_reviews_unique_active
  on public.peer_reviews(submission_id, reviewer_id)
  where deleted_at is null;

create index if not exists peer_reviews_submission_idx
  on public.peer_reviews(submission_id) where deleted_at is null;

create index if not exists peer_reviews_reviewer_idx
  on public.peer_reviews(reviewer_id) where deleted_at is null;

-- ----------------------------------------------------------------------
-- RLS — anyone authenticated can SELECT peer_reviews (the writer needs to
-- see them on their report; eventually anyone with profile access will see
-- them). INSERT/UPDATE require the calling user to be the reviewer AND
-- have is_reviewer = true.
-- ----------------------------------------------------------------------
alter table public.peer_reviews enable row level security;

create policy "anyone authenticated can read peer_reviews"
  on public.peer_reviews for select
  using (auth.uid() is not null and deleted_at is null);

create policy "reviewers can insert their own reviews"
  on public.peer_reviews for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_reviewer = true
    )
  );

create policy "reviewers can update their own reviews"
  on public.peer_reviews for update
  using (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_reviewer = true
    )
  );

-- ----------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------
create or replace function public.set_peer_reviews_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists peer_reviews_updated_at on public.peer_reviews;
create trigger peer_reviews_updated_at
  before update on public.peer_reviews
  for each row execute function public.set_peer_reviews_updated_at();
