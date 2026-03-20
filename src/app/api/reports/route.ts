import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.GEM_API_URL || "http://localhost:8000";

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${API_URL}/api/reports`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ reports: [] });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ reports: [] });
  }
}
