#!/usr/bin/env node
/**
 * Setup referral system:
 *   1. Create a Stripe coupon (GEM_REFERRAL — $5 off first month)
 *   2. Generate a unique Stripe promo code for every user who doesn't have one
 *   3. Save the referral_code to their profiles row
 *
 * Safe to re-run: skips users who already have a referral_code,
 * reuses the coupon if it already exists.
 *
 * Modes:
 *   (default)   dry run — show what would happen
 *   --run       actually create coupon + promo codes
 *
 * Run from gem-app/:
 *   node scripts/setup-referral-codes.mjs           # dry run
 *   node scripts/setup-referral-codes.mjs --run     # execute
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

// ── Load .env.local ────────────────────────────────────────────────
try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) {
        let v = m[2]
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
        process.env[m[1]] = v
      }
    }
  }
} catch {}

const RUN = process.argv.includes('--run')
const DRY = !RUN

const COUPON_ID = 'GEM_REFERRAL_5OFF'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
})

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// ── Step 1: Create or reuse the Stripe coupon ─────────────────────
async function ensureCoupon() {
  try {
    const existing = await stripe.coupons.retrieve(COUPON_ID)
    console.log(`Coupon "${COUPON_ID}" already exists (${existing.amount_off / 100} off)`)
    return existing
  } catch (e) {
    if (e.statusCode !== 404) throw e
  }

  if (DRY) {
    console.log(`[DRY] Would create coupon "${COUPON_ID}" — $5 off, once, forever`)
    return { id: COUPON_ID }
  }

  const coupon = await stripe.coupons.create({
    id: COUPON_ID,
    amount_off: 500, // $5.00 in cents
    currency: 'usd',
    duration: 'once', // applies to first invoice only
    name: 'GEM Referral — $5 off first month',
  })
  console.log(`Created coupon "${coupon.id}" — $${coupon.amount_off / 100} off first month`)
  return coupon
}

// ── Step 2: Generate a short unique code ──────────────────────────
function generateCode() {
  // 6-char alphanumeric, uppercase — easy to share verbally
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ── Step 3: Fetch all users without a referral code ───────────────
const { data: users, error } = await sb
  .from('profiles')
  .select('id, email, full_name, referral_code')
  .is('referral_code', null)
  .not('email', 'is', null)

if (error) {
  console.error('Query failed:', error)
  process.exit(1)
}

console.log(`\nUsers needing referral codes: ${users.length}`)

if (users.length === 0) {
  console.log('All users already have referral codes. Nothing to do.')
  process.exit(0)
}

// ── Step 4: Create coupon (if needed) ─────────────────────────────
const coupon = await ensureCoupon()

// ── Step 5: Generate promo codes and save ─────────────────────────
if (DRY) {
  console.log(`\n[DRY] Would generate ${users.length} Stripe promo codes under coupon "${coupon.id}"`)
  console.log('First 5 users:')
  for (const u of users.slice(0, 5)) {
    console.log(`  → ${u.email} — would get code like "${generateCode()}"`)
  }
  console.log('\nRun with --run to execute.')
  process.exit(0)
}

let created = 0
let failed = 0
const usedCodes = new Set()

for (const u of users) {
  // Generate unique code (retry if collision)
  let code
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCode()
    if (!usedCodes.has(candidate)) {
      code = candidate
      break
    }
  }
  if (!code) {
    console.error(`  ✗ Could not generate unique code for ${u.email}`)
    failed++
    continue
  }
  usedCodes.add(code)

  try {
    // Create Stripe promo code
    const promo = await stripe.promotionCodes.create({
      coupon: COUPON_ID,
      code: code,
      max_redemptions: null, // unlimited — each use gives referrer +2 submissions
      metadata: {
        referrer_user_id: u.id,
        referrer_email: u.email,
      },
    })

    // Save to profile
    const { error: upErr } = await sb
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', u.id)

    if (upErr) {
      console.error(`  ✗ Saved Stripe promo but failed DB update for ${u.email}:`, upErr)
      failed++
      continue
    }

    created++
    if (created % 10 === 0) console.log(`  [${created}] last=${u.email} code=${code}`)
  } catch (err) {
    console.error(`  ✗ Failed for ${u.email}:`, err.message)
    failed++
  }

  // Small delay to respect Stripe rate limits
  await new Promise(r => setTimeout(r, 100))
}

console.log(`\nDone. created=${created} failed=${failed}`)
