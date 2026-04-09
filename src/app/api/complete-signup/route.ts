import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/complete-signup
 *
 * Called after an anonymous user pays via Stripe Checkout.
 * Takes the Stripe session_id + a password the user chose,
 * creates the Supabase account, links it to Stripe, and
 * sets subscription to active.
 */
export async function POST(request: NextRequest) {
  const { session_id, password, full_name } = await request.json()

  if (!session_id || !password) {
    return NextResponse.json(
      { error: 'Missing session_id or password' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    )
  }

  // 1. Retrieve Stripe session to get customer email + customer ID
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    return NextResponse.json(
      { error: 'Invalid checkout session' },
      { status: 400 }
    )
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      { error: 'Payment not completed' },
      { status: 400 }
    )
  }

  const email = session.customer_details?.email || session.customer_email
  if (!email) {
    return NextResponse.json(
      { error: 'No email found in checkout session' },
      { status: 400 }
    )
  }

  const stripeCustomerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id

  // 2. Use Supabase Admin to create the user
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if user already exists (e.g. page reload)
  const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: newUser, error: signUpError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since they paid
      user_metadata: {
        full_name: full_name || email.split('@')[0],
      },
    })

    if (signUpError || !newUser.user) {
      return NextResponse.json(
        { error: signUpError?.message || 'Failed to create account' },
        { status: 500 }
      )
    }

    userId = newUser.user.id
  }

  // 3. Update profile with Stripe customer ID + active subscription
  await adminSupabase
    .from('profiles')
    .update({
      stripe_customer_id: stripeCustomerId,
      subscription_status: 'active',
    })
    .eq('id', userId)

  // 4. Claim the anonymous submission that triggered this purchase
  const redirectReport = session.metadata?.redirect_report || null
  if (redirectReport) {
    // redirectReport is the evaluation ID — find its submission and claim it
    const { data: evalRow } = await adminSupabase
      .from('script_evaluations')
      .select('submission_id')
      .eq('id', redirectReport)
      .single()

    if (evalRow?.submission_id) {
      await adminSupabase
        .from('script_submissions')
        .update({ user_id: userId })
        .eq('id', evalRow.submission_id)
        .is('user_id', null) // only claim if still anonymous
    }
  }

  // 5. Update Stripe customer with supabase_user_id metadata
  if (stripeCustomerId) {
    await stripe.customers.update(stripeCustomerId, {
      metadata: { supabase_user_id: userId },
    })
  }

  // 6. Sign the user in via the regular Supabase client (sets auth cookies)
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

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    // Account was created and subscription is active, but auto-login failed.
    // They can still log in manually.
    return NextResponse.json({
      success: true,
      login_failed: true,
      message: 'Account created! Please log in with your email and password.',
    })
  }

  return NextResponse.json({
    success: true,
    redirect_report: redirectReport,
  })
}
