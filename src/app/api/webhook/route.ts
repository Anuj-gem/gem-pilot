import { NextResponse } from "next/server";

/**
 * @deprecated Use /api/stripe/webhook instead.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been replaced. Use /api/stripe/webhook." },
    { status: 410 },
  );
}
