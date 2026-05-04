import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'

const COUPON_ID = 'GEM_REFERRAL_5OFF'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Service client for writes
  const service = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )

  // Check if user already has a code
  const { data: profile } = await service
    .from('profiles')
    .select('referral_code, email')
    .eq('id', user.id)
    .single()

  if (profile?.referral_code) {
    return NextResponse.json({ code: profile.referral_code })
  }

  // Generate unique code with retries
  let code: string | null = null
  for (let i = 0; i < 10; i++) {
    const candidate = generateCode()
    const { data: existing } = await service
      .from('profiles')
      .select('id')
      .eq('referral_code', candidate)
      .maybeSingle()
    if (!existing) {
      code = candidate
      break
    }
  }

  if (!code) {
    return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 })
  }

  try {
    // Create Stripe promo code
    await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: COUPON_ID },
      code,
      metadata: {
        referrer_user_id: user.id,
        referrer_email: profile?.email || user.email || '',
      },
    })

    // Save to profile
    await service
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', user.id)

    return NextResponse.json({ code })
  } catch (err: unknown) {
    console.error('Failed to create referral code:', err)
    return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 })
  }
}
