-- ============================================
-- 48-HOUR FREE TRIAL SUPPORT
-- ============================================
-- Replaces the single free_eval_used boolean with a time-based trial.
-- New users get 48 hours of unlimited access from signup.

-- Add trial_ends_at column (NULL = no trial, check timestamp for active)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Backfill: give existing users who haven't used their free eval a 48hr trial from now
-- Users who already used their free eval get no trial (they already had their chance)
UPDATE public.profiles
  SET trial_ends_at = now() + interval '48 hours'
  WHERE free_eval_used = false
    AND subscription_status != 'active'
    AND trial_ends_at IS NULL;

-- Update the handle_new_user trigger to set trial_ends_at on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, trial_ends_at)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    now() + interval '48 hours'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
