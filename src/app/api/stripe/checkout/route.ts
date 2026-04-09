import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component */ }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Parse body
  let redirectReport: string | null = null
  let anonymous = false
  try {
    const body = await request.json()
    redirectReport = body.redirect_report || null
    anonymous = body.anonymous === true
  } catch {
    // No body or invalid JSON — that's fine
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://gem-pilot.vercel.app'

  // ─── Anonymous flow: no account yet, Stripe collects email ────────
  if (!user && anonymous) {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: redirectReport
        ? `${origin}/complete-signup?session_id={CHECKOUT_SESSION_ID}&report=${redirectReport}`
        : `${origin}/complete-signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: redirectReport
        ? `${origin}/report/${redirectReport}?cancelled=true`
        : `${origin}/?cancelled=true`,
      metadata: {
        anonymous: 'true',
        redirect_report: redirectReport || '',
      },
    })

    return NextResponse.json({ url: session.url })
  }

  // ─── Authenticated flow: existing user ────────────────────────────
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user already has a Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_status')
    .eq('id', user.id)
    .single()

  // If already active, redirect to portal instead
  if (profile?.subscription_status === 'active') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
  }

  // Reuse or create Stripe customer
  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    // Store customer ID immediately
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll() { return [] }, setAll() {} } }
    )
    await serviceSupabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const successUrl = redirectReport
    ? `${origin}/report/${redirectReport}?subscribed=true`
    : `${origin}/submit?subscribed=true`

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    allow_promotion_codes: true,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: redirectReport
      ? `${origin}/report/${redirectReport}?cancelled=true`
      : `${origin}/submit?cancelled=true`,
    metadata: {
      supabase_user_id: user.id,
      redirect_report: redirectReport || '',
    },
  })

  return NextResponse.json({ url: session.url })
}
