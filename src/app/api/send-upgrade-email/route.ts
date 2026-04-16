/**
 * POST /api/send-upgrade-email
 *
 * Fires the post_upgrade email. Called client-side after returning from
 * Stripe checkout as a belt-and-suspenders backup to the webhook.
 * Idempotent via email_outbox dedupe.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/email";

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("email, full_name, subscription_status, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile?.email || profile.subscription_status !== "active") {
      return NextResponse.json({ error: "Not subscribed" }, { status: 400 });
    }

    const firstName = profile.full_name?.split(" ")[0] || "there";

    await sendEmail(
      {
        templateAlias: "post_upgrade",
        to: profile.email,
        variables: { first_name: firstName },
        dedupeKey: `${user.id}_${profile.stripe_subscription_id || "upgrade"}`,
        tag: "post_upgrade",
      },
      serviceClient
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-upgrade-email] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
