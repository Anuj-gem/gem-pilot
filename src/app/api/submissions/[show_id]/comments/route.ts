import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

// GET /api/submissions/[show_id]/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: { show_id: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const ADMIN_EMAIL = process.env.GEM_ADMIN_EMAIL || "anujkommareddy@gmail.com";
  const isAdmin = user!.email === ADMIN_EMAIL;

  try {
    const client = isAdmin ? createServiceClient() : createServerSupabaseClient();
    const { data, error: dbError } = await client
      .from("gem_comments")
      .select("*")
      .eq("show_id", params.show_id)
      .order("created_at", { ascending: true });

    if (dbError) throw dbError;

    return NextResponse.json({ comments: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/submissions/[show_id]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: { show_id: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const ADMIN_EMAIL = process.env.GEM_ADMIN_EMAIL || "anujkommareddy@gmail.com";
  const isAdmin = user!.email === ADMIN_EMAIL;

  try {
    const { body: commentBody } = await req.json();
    if (!commentBody?.trim()) {
      return NextResponse.json({ error: "Comment body required" }, { status: 400 });
    }

    // Admin uses service client to bypass RLS
    const client = isAdmin ? createServiceClient() : createServerSupabaseClient();

    const { data, error: dbError } = await client
      .from("gem_comments")
      .insert({
        show_id: params.show_id,
        user_id: user!.id,
        author_name: isAdmin ? "GEM" : (user!.email?.split("@")[0] || "Writer"),
        is_gem_team: isAdmin,
        body: commentBody.trim(),
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ comment: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
