-- Enable RLS on tables flagged by the Supabase security advisor.
-- All of these are either legacy (pre-pivot producer-app tables, no longer
-- referenced by the live writer-app codebase) or accessed only by the
-- service-role server client (which bypasses RLS). Enabling RLS without
-- adding policies effectively locks them to service-role + any pre-existing
-- policies, which is exactly what we want.

-- Legacy tables — not referenced anywhere in gem-app/src
ALTER TABLE public.uploads                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_runs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_runs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_views                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_shares                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_evaluations_v3_backup  ENABLE ROW LEVEL SECURITY;

-- Used only by server-side service-role code (RLS bypassed by service role)
ALTER TABLE public.email_outbox                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_evaluations_pending    ENABLE ROW LEVEL SECURITY;
