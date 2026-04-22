-- Soft-remove for writer dashboards.
--
-- Writers asked for a way to clear clutter from their dashboard without
-- permanently deleting the evaluation or the report. `hidden_at` is the soft-
-- hide timestamp: null = visible, non-null = hidden.
--
-- Semantics:
--   - Dashboard query filters out hidden submissions (see src/app/dashboard).
--   - The `leaderboard` view filters them out too (below), so a hidden script
--     stops showing on Discover even if it was previously public. The
--     underlying `is_public` flag is preserved so restore keeps that intent.
--   - The free-eval paywall rule (/report/[id]/page.tsx) does NOT filter by
--     hidden_at — it looks at the oldest completed submission regardless. A
--     free user who hides their first script is still considered to have used
--     their free evaluation.
--   - There is intentionally no user-facing restore UI. Restore is a support
--     path — clear `hidden_at` back to null in SQL when requested.
--
-- Writes to `hidden_at` happen server-side via /api/submissions/[id]/hide
-- (service-role client after an ownership check). No new RLS policy is added.

ALTER TABLE public.script_submissions
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

COMMENT ON COLUMN public.script_submissions.hidden_at IS
  'Soft-hide timestamp. Null = visible on dashboard / Discover. Non-null = writer removed from their dashboard. is_public is preserved so a later restore keeps the writer''s publish intent.';

CREATE INDEX IF NOT EXISTS script_submissions_user_hidden_idx
  ON public.script_submissions (user_id, hidden_at);

-- Rebuild the leaderboard view so hidden scripts drop off Discover
-- automatically. All other COALESCE logic from migration 011 is preserved.
DROP VIEW IF EXISTS public.leaderboard;

CREATE OR REPLACE VIEW public.leaderboard AS
  SELECT
    e.id AS evaluation_id,
    s.id AS submission_id,
    s.title,
    s.user_id,
    p.full_name AS author_name,
    p.avatar_url,
    e.weighted_score,
    e.tier,
    COALESCE(
      e.evaluation->'classification'->>'format',
      e.evaluation->'format_detection'->>'format'
    ) AS format,
    COALESCE(
      e.edited_fields->>'genre_primary',
      e.evaluation->'classification'->>'genre_primary',
      e.evaluation->'format_detection'->>'genre_primary'
    ) AS genre,
    COALESCE(
      e.edited_fields->>'tone',
      e.evaluation->'classification'->>'tone',
      e.evaluation->'format_detection'->>'tone'
    ) AS tone,
    COALESCE(
      e.edited_fields->'genre_tags',
      e.evaluation->'classification'->'genre_tags',
      e.evaluation->'format_detection'->'genre_tags'
    ) AS genre_tags,
    COALESCE(
      e.evaluation->'classification'->>'logline',
      e.evaluation->'format_detection'->>'logline'
    ) AS logline,
    COALESCE(
      e.edited_fields->>'logline',
      e.evaluation->>'positioning_hook'
    ) AS positioning_hook,
    COALESCE(
      e.evaluation->'whats_special'->>'headline',
      e.evaluation->>'overall_take'
    ) AS overall_take,
    COALESCE(lk.like_count, 0) AS like_count,
    e.created_at
  FROM public.script_evaluations e
  JOIN public.script_submissions s ON e.submission_id = s.id
  JOIN public.profiles p ON s.user_id = p.id
  LEFT JOIN (
    SELECT evaluation_id, COUNT(*) AS like_count
    FROM public.script_likes
    GROUP BY evaluation_id
  ) lk ON lk.evaluation_id = e.id
  WHERE s.status = 'completed'
    AND s.is_public = true
    AND s.hidden_at IS NULL
  ORDER BY e.created_at DESC;
