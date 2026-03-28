import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

// GET /api/submissions/[show_id] — get a single submission
// Writers can only get their own; admin can get any
export async function GET(
  _req: NextRequest,
  { params }: { params: { show_id: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const ADMIN_EMAIL = process.env.GEM_ADMIN_EMAIL || "anujkommareddy@gmail.com";
  const isAdmin = user!.email === ADMIN_EMAIL;

  try {
    // Admin uses service client (bypasses RLS), writers use their own session
    const client = isAdmin ? createServiceClient() : createServerSupabaseClient();

    const { data, error: dbError } = await client
      .from("gem_submissions")
      .select("*")
      .eq("show_id", params.show_id)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ submission: null });
    }

    return NextResponse.json({ submission: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/submissions/[show_id] — admin: update status, notes, publish review
export async function PATCH(
  req: NextRequest,
  { params }: { params: { show_id: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const ADMIN_EMAIL = process.env.GEM_ADMIN_EMAIL || "anujkommareddy@gmail.com";
  if (user!.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { status, admin_notes } = body;

    const updates: Record<string, any> = {};
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (status) {
      updates.status = status;
      if (status === "published") updates.published_at = new Date().toISOString();
    }

    const adminClient = createServiceClient();
    const { data, error: dbError } = await adminClient
      .from("gem_submissions")
      .update(updates)
      .eq("show_id", params.show_id)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ submission: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
