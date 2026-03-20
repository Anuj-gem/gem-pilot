import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/analysis (Legacy)
 *
 * This route is deprecated. The app now uses:
 *   POST /api/evaluate  → file upload + scoring
 *   GET  /api/jobs/:id  → job polling
 *   GET  /api/reports/:id → report retrieval
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Use POST /api/evaluate instead.",
    },
    { status: 410 }
  );
}
