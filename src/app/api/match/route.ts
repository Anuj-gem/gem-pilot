import { NextRequest, NextResponse } from "next/server";
import { matchScript } from "@/lib/match-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logline, title, medium, genre_hint, budget_hint, notes, top_n } = body;

    if (!logline || typeof logline !== "string") {
      return NextResponse.json(
        { error: "logline is required" },
        { status: 400 },
      );
    }

    const { profile, matches } = matchScript(logline, {
      title,
      medium,
      genre_hint,
      budget_hint,
      notes,
      top_n: top_n ?? 5,
    });

    return NextResponse.json({ profile, matches });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Matching failed" },
      { status: 500 },
    );
  }
}
