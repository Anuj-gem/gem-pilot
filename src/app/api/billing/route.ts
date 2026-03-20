import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing
 *
 * Creates a Stripe Checkout session for subscription.
 * In production: uses Stripe SDK to create checkout URL.
 */
export async function POST(_req: NextRequest) {
  try {
    // TODO: In production:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    //   success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    //   cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    //   subscription_data: { trial_period_days: 7 },
    // });
    // return NextResponse.json({ url: session.url });

    return NextResponse.json({
      message: "Stripe checkout not yet connected. Configure STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
      url: null,
    });
  } catch (error) {
    console.error("Billing error:", error);
    return NextResponse.json({ error: "Billing setup failed" }, { status: 500 });
  }
}
