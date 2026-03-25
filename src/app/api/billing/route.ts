import { NextResponse } from "next/server";

/**
 * @deprecated Use /api/stripe/checkout and /api/stripe/portal instead.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been replaced. Use /api/stripe/checkout." },
    { status: 410 },
  );
}
