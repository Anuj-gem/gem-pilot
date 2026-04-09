-- Add tone and genre_tags to leaderboard view
-- Also fixes stale view that was returning NULLs for format/genre/logline

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
      e.evaluation->'classification'->>'genre_primary',
      e.evaluation->'format_detection'->>'genre_primary'
    ) AS genre,
    COALESCE(
      e.evaluation->'classification'->>'tone',
      e.evaluation->'format_detection'->>'tone'
    ) AS tone,
    COALESCE(
      e.evaluation->'classification'->'genre_tags',
      e.evaluation->'format_detection'->'genre_tags'
    ) AS genre_tags,
    COALESCE(
      e.evaluation->'classification'->>'logline',
      e.evaluation->'format_detection'->>'logline'
    ) AS logline,
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
  ORDER BY e.weighted_score DESC;
