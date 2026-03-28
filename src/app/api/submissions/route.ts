import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

// POST /api/submissions — save submission metadata to Supabase
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const {
      show_id,
      title,
      pitch,
      season_plan,
      casting_vision,
      imdb_url,
      collaborators,
      concept_image_urls,
    } = body;

    if (!show_id) {
      return NextResponse.json({ error: "show_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error: dbError } = await supabase
      .from("gem_submissions")
      .upsert(
        {
          user_id: user!.id,
          show_id,
          title: title || show_id,
          pitch: pitch || null,
          season_plan: season_plan || null,
          casting_vision: casting_vision || null,
          imdb_url: imdb_url || null,
          collaborators: collaborators || [],
          concept_image_urls: concept_image_urls || [],
          status: "pending_review",
        },
        { onConflict: "user_id,show_id" }
      )
      .select()
      .single();

    if (dbError) {
      console.error("[GEM] Failed to save submission:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ submission: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/submissions
// Admin: returns all submissions
// Writers: returns only their own (status only, for dashboard display)
export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const ADMIN_EMAIL = process.env.GEM_ADMIN_EMAIL || "anujkommareddy@gmail.com";
  const isAdmin = user!.email === ADMIN_EMAIL;

  try {
    if (isAdmin) {
      const adminClient = createServiceClient();
      const { data, error: dbError } = await adminClient
        .from("gem_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (dbError) throw dbError;
      return NextResponse.json({ submissions: data });
    } else {
      // Writers get their own submissions (minimal fields for dashboard)
      const supabase = createServerSupabaseClient();
      const { data, error: dbError } = await supabase
        .from("gem_submissions")
        .select("show_id, title, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (dbError) throw dbError;
      return NextResponse.json({ submissions: data || [] });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
