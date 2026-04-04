import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Service client for writes
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

// Auth client to get current user
async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function POST(request: NextRequest) {
  try {
    const { submission_id } = await request.json();
    if (!submission_id) {
      return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
    }

    // Verify user is authenticated
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Find the submission — must be anonymous (user_id null)
    const { data: submission } = await serviceClient
      .from("script_submissions")
      .select("id, user_id, expires_at")
      .eq("id", submission_id)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.user_id) {
      return NextResponse.json({ error: "Already assigned" }, { status: 400 });
    }

    // Assign to user and clear expiry
    await serviceClient
      .from("script_submissions")
      .update({
        user_id: user.id,
        expires_at: null,
      })
      .eq("id", submission_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Assign submission error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
