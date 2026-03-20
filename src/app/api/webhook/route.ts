import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/webhook
 *
 * Stripe webhook handler for subscription lifecycle events.
 * In production: verifies Stripe signature, updates user subscription status.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // TODO: In production:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const sig = req.headers.get('stripe-signature')!;
    // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    //
    // switch (event.type) {
    //   case 'customer.subscription.created':
    //   case 'customer.subscription.updated':
    //     // Update profile.subscription_status
    //     break;
    //   case 'customer.subscription.deleted':
    //     // Set subscription_status to 'canceled'
    //     break;
    //   case 'invoice.payment_failed':
    //     // Set subscription_status to 'past_due'
    //     break;
    // }

    console.log("Webhook received (mock):", body.substring(0, 100));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
}
