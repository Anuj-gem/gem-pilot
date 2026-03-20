import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.GEM_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    // Forward the multipart form data to FastAPI
    const formData = await req.formData();

    const res = await fetch(`${API_URL}/api/evaluate`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Evaluation failed" }));
      return NextResponse.json(
        { error: err.detail || "Evaluation failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to connect to scoring engine" },
      { status: 502 }
    );
  }
}
