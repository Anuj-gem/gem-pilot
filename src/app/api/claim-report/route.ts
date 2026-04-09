// DEPRECATED — replaced by /api/assign-submission
// This endpoint is no longer used. The inline signup flow on the report page
// now calls /api/assign-submission directly.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been removed. Use /api/assign-submission instead." },
    { status: 410 }
  );
}
