-- ============================================
-- DISCOVERY / LEADERBOARD additions
-- ============================================

-- 1. Public toggle on submissions
ALTER TABLE public.script_submissions
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 2. Likes table
CREATE TABLE IF NOT EXISTS public.script_likes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  evaluation_id uuid REFERENCES public.script_evaluations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(evaluation_id, user_id)
);

ALTER TABLE public.script_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.script_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like"
  ON public.script_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
  ON public.script_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Public-read policies so the discovery page works for any logged-in user
CREATE POLICY "Anyone can view public submissions"
  ON public.script_submissions FOR SELECT
  USING (is_public = true);

CREATE POLICY "Anyone can view public evaluations"
  ON public.script_evaluations FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.script_submissions WHERE is_public = true
    )
  );

-- 4. Recreate leaderboard view with is_public filter + like count
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
    (e.evaluation->'format_detection'->>'format') AS format,
    (e.evaluation->'format_detection'->>'genre_primary') AS genre,
    (e.evaluation->'format_detection'->>'logline') AS logline,
    e.evaluation->'overall_take' AS overall_take,
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
