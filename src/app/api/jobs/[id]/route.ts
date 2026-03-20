import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.GEM_API_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`${API_URL}/api/jobs/${params.id}`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to scoring engine" },
      { status: 502 }
    );
  }
}
