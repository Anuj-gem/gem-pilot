-- ============================================
-- BLURRED REPORT PAYWALL — Anonymous Evals + Rate Limiting
-- ============================================
-- Replaces the trial system with a blurred-report paywall.
-- Anyone can evaluate scripts (rate limited). Full reports require subscription.
-- Anonymous (no account) evals are supported on desktop.

-- 1. Allow anonymous submissions (user_id can be null)
ALTER TABLE public.script_submissions
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Track source IP for rate limiting anonymous evals
ALTER TABLE public.script_submissions
  ADD COLUMN IF NOT EXISTS submitted_by_ip text;

-- 3. Index for fast rate-limit lookups (only rows with an IP)
CREATE INDEX IF NOT EXISTS idx_submissions_ip_created
  ON public.script_submissions (submitted_by_ip, created_at)
  WHERE submitted_by_ip IS NOT NULL;

-- 4. RLS: Allow anonymous users to read their own evaluations via submission_id
--    (the evaluate API returns submission_id + evaluation_id, and the report page
--     fetches by evaluation_id — so we need public read on evaluations for
--     anonymous submissions, same as we already have for public/leaderboard ones)
CREATE POLICY "Anyone can view evaluations for anonymous submissions"
  ON public.script_evaluations FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.script_submissions WHERE user_id IS NULL
    )
  );

-- Anonymous submissions are readable by anyone (they have no owner to gate on)
CREATE POLICY "Anyone can view anonymous submissions"
  ON public.script_submissions FOR SELECT
  USING (user_id IS NULL);

-- 5. Revert handle_new_user trigger to NOT set trial_ends_at
--    (trial system is superseded by blurred paywall)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
