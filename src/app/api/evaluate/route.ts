import { NextRequest, NextResponse } from "next/server";
import { requireSubscription } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase-server";

const API_URL = process.env.GEM_API_URL || "http://localhost:8000";
const API_SECRET = process.env.GEM_API_SECRET || "";

export async function POST(req: NextRequest) {
  // Auth + subscription / free-tier check
  const { user, error } = await requireSubscription();
  if (error) return error;

  try {
    const formData = await req.formData();

    // Forward the show_id query param if provided by the client
    const showId = req.nextUrl.searchParams.get("show_id");
    let upstreamUrl = `${API_URL}/api/evaluate`;
    const params = new URLSearchParams();
    if (showId) params.set("show_id", showId);
    if (user) params.set("user_id", user.id);
    if (params.toString()) upstreamUrl += `?${params.toString()}`;

    const res = await fetch(upstreamUrl, {
      method: "POST",
      body: formData,
      headers: API_SECRET ? { "X-API-Secret": API_SECRET } : {},
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Evaluation failed" }));
      return NextResponse.json(
        { error: err.detail || "Evaluation failed" },
        { status: res.status },
      );
    }

    const data = await res.json();

    // Increment evals_used — must use service role client since the RPC
    // only grants execute to service_role, not authenticated/anon
    if (user) {
      const adminClient = createServiceClient();
      const { error: rpcError } = await adminClient.rpc("increment_evals_used", { user_id: user.id });
      if (rpcError) console.error("Failed to increment evals_used:", rpcError);
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to connect to scoring engine" },
      { status: 502 },
    );
  }
}
