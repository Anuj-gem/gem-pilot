-- Edit flow: lets writers tweak the top card of their report (title, genre,
-- tone, logline) after evaluation without touching the underlying scoring or
-- the pitch/development tabs.
--
-- Storage model (mixed on purpose):
--   - Title edits are written in-place to public.script_submissions.title.
--     There is already a "Users can update own submissions" policy.
--   - Genre / tone / logline edits live inside a new jsonb column on
--     public.script_evaluations so the original generated value is preserved
--     and we can always revert to it.
--
-- Edits on script_evaluations.edited_fields happen server-side via the
-- /api/evaluations/[id]/edit route (service-role write after ownership check).
-- No RLS UPDATE policy is added here — owners never touch the table directly.
--
-- The leaderboard view is rebuilt so Discover surfaces the edited values
-- immediately; COALESCE on edited_fields -> evaluation falls back to the
-- generated value when nothing has been edited.

ALTER TABLE public.script_evaluations
  ADD COLUMN IF NOT EXISTS edited_fields jsonb;

COMMENT ON COLUMN public.script_evaluations.edited_fields IS
  'Writer-edited overrides for the report top card. Keys: logline, genre_primary, genre_tags (jsonb array), tone. Null or missing keys fall back to the generated evaluation value.';

-- Rebuild the leaderboard view so Discover reads edited overrides first.
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
    -- Edited logline wins over the generated positioning_hook. Only one
    -- string is surfaced as the one-liner on Discover cards.
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
  ORDER BY e.created_at DESC;
