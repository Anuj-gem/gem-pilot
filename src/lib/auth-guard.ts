import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * Validates auth and returns the user + profile.
 * Returns an error response if not authenticated.
 */
export async function requireAuth() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile, error: null };
}

/**
 * Validates auth AND checks the user can run an evaluation.
 *
 * GEM is now free for all writers — no paywall, no limits.
 * This function exists for forward compatibility (e.g. rate limiting).
 */
export async function requireSubscription() {
  return requireAuth();
}
