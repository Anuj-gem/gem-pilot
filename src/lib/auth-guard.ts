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
 * Rules:
 *  - Active subscribers → always allowed
 *  - Free users → allowed if evals_used < 2
 *  - Anyone else (canceled, past_due, exceeded free tier) → 402 with paywall flag
 */
export async function requireSubscription() {
  const result = await requireAuth();
  if (result.error) return result;

  const { profile } = result;
  const status = profile?.subscription_status ?? "free";
  const evalsUsed = profile?.evals_used ?? 0;

  // Active paid subscriber — always allowed
  if (status === "active") {
    return result;
  }

  // Free tier — allow up to 2 evaluations
  if (status === "free" && evalsUsed < 2) {
    return result;
  }

  // Everything else: free tier exhausted, canceled, past_due, etc.
  return {
    ...result,
    error: NextResponse.json(
      {
        error: "Free evaluations used. Subscribe to continue.",
        code: "SUBSCRIPTION_REQUIRED",
        evals_used: evalsUsed,
        subscription_status: status,
      },
      { status: 402 },
    ),
  };
}
