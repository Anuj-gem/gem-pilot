import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

const API_URL = process.env.GEM_API_URL || "http://localhost:8000";
const API_SECRET = process.env.GEM_API_SECRET || "";

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const url = `${API_URL}/api/jobs?user_id=${user!.id}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: API_SECRET ? { "X-API-Secret": API_SECRET } : {},
    });
    if (!res.ok) {
      return NextResponse.json({ jobs: [] });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ jobs: [] });
  }
}
