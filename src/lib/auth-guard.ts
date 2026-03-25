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
 * Validates auth AND checks subscription is active or trialing.
 * Returns error response if not subscribed.
 *
 * NOTE: Stripe/payments not yet configured — subscription check is bypassed.
 * Re-enable the check below once Stripe is hooked up.
 */
export async function requireSubscription() {
  // Bypass subscription gate until Stripe is configured
  return requireAuth();

  /* --- re-enable when Stripe is live ---
  const result = await requireAuth();
  if (result.error) return result;

  const { profile } = result;
  const status = profile?.subscription_status;
  const allowed = ["active", "trialing"];

  if (!status || !allowed.includes(status)) {
    return {
      ...result,
      error: NextResponse.json(
        {
          error: "Active subscription required",
          subscription_status: status || "none",
        },
        { status: 403 },
      ),
    };
  }

  return result;
  --- end Stripe gate --- */
}
