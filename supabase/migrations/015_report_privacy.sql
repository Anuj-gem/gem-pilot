-- Granular per-section privacy for report pages.
--
-- Before this migration:
--   submissions.is_public — single bool. True = on Discover, full Pitch tab
--   visible to anyone with the link, Details tab blurred for non-owners.
--
-- After:
--   submissions.is_public — unchanged. Still the "on Discover" master switch.
--   submissions.report_privacy — JSONB, per-section public/private control.
--     The writer decides what a non-owner sees; private sections are HIDDEN
--     (not blurred — Anuj's call: blur is a tease that irritates; hide is
--     clean and pushes viewers to the contact-writer CTA).
--
-- Section keys (match the v2 exec-summary + deep-dive structure):
--   headline               → top card: title + headline (logline)
--   score                  → commercial potential score + tier
--   whats_working          → "why this can be a hit" strengths
--   sharpest_lever         → primary lever (biggest dev note) + craft note
--   production_signal      → at-a-glance production reality teaser
--   deep_dive_characters   → lead characters + actor appeal
--   deep_dive_package      → package angles (director + buyer)
--   deep_dive_production   → full production planning details
--   deep_dive_development  → full development priorities list
--   deep_dive_narrative    → 10-dimension breakdown + reasoning
--
-- Each value is 'public' or 'private'. Missing keys fall through to the
-- default resolver in src/lib/report-privacy.ts — this keeps the DB shape
-- stable even as we tweak defaults in app code.

alter table public.script_submissions
  add column if not exists report_privacy jsonb not null default
    '{"version":1,"sections":{}}'::jsonb;

alter table public.script_submissions
  add column if not exists contact_enabled boolean not null default true;

-- Backfill: existing published reports migrate to safe defaults —
-- headline + whats_working + production_signal public, score private,
-- everything else private. Writers see a dashboard banner nudging them
-- to review. Unpublished rows keep the empty JSON (defaults apply when
-- the report is later shared).
update public.script_submissions
set report_privacy = jsonb_build_object(
  'version', 1,
  'migrated_at', (now() at time zone 'utc')::text,
  'sections', jsonb_build_object(
    'headline',              'public',
    'score',                 'private',
    'whats_working',         'public',
    'sharpest_lever',        'private',
    'production_signal',     'public',
    'deep_dive_characters',  'private',
    'deep_dive_package',     'private',
    'deep_dive_production',  'private',
    'deep_dive_development', 'private',
    'deep_dive_narrative',   'private'
  )
)
where is_public = true
  and (report_privacy is null or report_privacy = '{"version":1,"sections":{}}'::jsonb);

-- Dashboard banner uses this column to know which writers need to review
-- migrated defaults. Reset to null once they've opened the privacy panel.
alter table public.script_submissions
  add column if not exists privacy_review_needed boolean not null default false;

update public.script_submissions
set privacy_review_needed = true
where is_public = true;

create index if not exists script_submissions_privacy_review_idx
  on public.script_submissions (user_id) where privacy_review_needed = true;

-- contact_messages gains a fast-lookup index for the admin inbox (Anuj
-- reads everything that comes in). No schema change otherwise — the
-- existing table already has sender_email, sender_name, message.
create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
