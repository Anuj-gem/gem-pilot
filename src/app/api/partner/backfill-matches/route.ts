// POST /api/partner/backfill-matches
//
// Called from the producer onboarding form (and any future "edit lane" form)
// after the producer's `lane` is saved. Runs the inverse matching pass:
// for this one producer, scan all existing v5.4-scored submissions and
// create script_matches rows for whatever fits their lane.
//
// Auth: must be the calling producer themselves (no admin shortcut needed
// here — producers can only ever backfill their own inbox).

import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createMatchesForProducer } from "@/lib/matching"

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function POST() {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Use the service client for the matching logic so we can query across all
  // submissions + producers without RLS getting in the way.
  const serviceClient = createServiceClient()
  try {
    const result = await createMatchesForProducer(user.id, serviceClient)
    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[backfill-matches] failed:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
