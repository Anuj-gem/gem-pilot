-- Review invites — per-script reviewer permission grants.
-- Anuj 2026-04-29 (peer-reviews v0.2).
--
-- A writer can invite anyone (by email) to review a specific script. The
-- invitee gets an email with a magic link that grants them reviewer access
-- to that one script (independent of the global profiles.is_reviewer flag).
-- This is the viral wedge: each invite pulls a non-user into GEM.

create table if not exists public.review_invites (
  id              uuid primary key default uuid_generate_v4(),
  submission_id   uuid not null references public.script_submissions(id) on delete cascade,
  invited_by      uuid not null references public.profiles(id) on delete cascade,
  invited_email   text not null,
  token           text unique not null,
  invited_user_id uuid references public.profiles(id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending','accepted','completed','declined','expired')),
  note            text,
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '60 days')
);

create unique index if not exists review_invites_unique_pending
  on public.review_invites(submission_id, lower(invited_email))
  where status in ('pending','accepted');

create index if not exists review_invites_email_idx
  on public.review_invites(lower(invited_email));
create index if not exists review_invites_token_idx
  on public.review_invites(token);
create index if not exists review_invites_submission_idx
  on public.review_invites(submission_id);
create index if not exists review_invites_user_idx
  on public.review_invites(invited_user_id);

alter table public.review_invites enable row level security;

create policy "owner can read review_invites"
  on public.review_invites for select
  using (
    exists (
      select 1 from public.script_submissions s
      where s.id = review_invites.submission_id and s.user_id = auth.uid()
    )
  );

create policy "invitee can read own review_invites"
  on public.review_invites for select
  using (auth.uid() = invited_user_id);

create policy "owner can insert review_invites"
  on public.review_invites for insert
  with check (
    auth.uid() = invited_by
    and exists (
      select 1 from public.script_submissions s
      where s.id = submission_id and s.user_id = auth.uid()
    )
  );

create policy "owner can delete review_invites"
  on public.review_invites for delete
  using (
    exists (
      select 1 from public.script_submissions s
      where s.id = review_invites.submission_id and s.user_id = auth.uid()
    )
  );

-- peer_reviews policies updated to honor either is_reviewer OR accepted invite.
drop policy if exists "reviewers can insert their own reviews" on public.peer_reviews;
create policy "reviewers can insert their own reviews"
  on public.peer_reviews for insert
  with check (
    auth.uid() = reviewer_id
    and (
      exists (select 1 from public.profiles where id = auth.uid() and is_reviewer = true)
      or exists (
        select 1 from public.review_invites
        where submission_id = peer_reviews.submission_id
          and invited_user_id = auth.uid()
          and status in ('accepted','completed')
      )
    )
  );

drop policy if exists "reviewers can update their own reviews" on public.peer_reviews;
create policy "reviewers can update their own reviews"
  on public.peer_reviews for update
  using (
    auth.uid() = reviewer_id
    and (
      exists (select 1 from public.profiles where id = auth.uid() and is_reviewer = true)
      or exists (
        select 1 from public.review_invites
        where submission_id = peer_reviews.submission_id
          and invited_user_id = auth.uid()
          and status in ('accepted','completed')
      )
    )
  );
