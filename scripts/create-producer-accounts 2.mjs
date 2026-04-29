/**
 * Create vetted producer accounts in bulk.
 *
 * Anuj 2026-04-28: producer signup is invite-only. This script creates
 * Supabase auth users for producers Anuj has personally vetted, sets
 * account_type='producer' on their profile, and confirms their email so
 * they can log in immediately with the password printed at the end.
 *
 * Lane (genre/format/budget) is intentionally LEFT EMPTY. Each producer
 * sets their own lane via /onboarding/producer the first time they log
 * in. That's how matching gets activated for them.
 *
 * Usage:
 *   # Default — creates anuj+producer1@gem.studio through anuj+producer5@gem.studio
 *   node scripts/create-producer-accounts.mjs
 *
 *   # Specific emails
 *   node scripts/create-producer-accounts.mjs lena@example.com marcus@example.com
 *
 *   # Custom password (default is auto-generated per account)
 *   node scripts/create-producer-accounts.mjs --password=Producer2026!
 *
 *   # Dry — show what would be created
 *   node scripts/create-producer-accounts.mjs --dry
 *
 * Env (auto-loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

// ── .env.local loader ──────────────────────────────────────────────
try {
  const envRaw = await fs.readFile(path.join(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envRaw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SERVICE_KEY) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.')
  process.exit(1)
}

const args = process.argv.slice(2)
const DRY = args.includes('--dry') || args.includes('--dry-run')
const passwordArg = args.find((a) => a.startsWith('--password='))
const FIXED_PASSWORD = passwordArg ? passwordArg.split('=')[1] : null

const positional = args.filter((a) => !a.startsWith('--'))
const DEFAULT_EMAILS = [1, 2, 3, 4, 5].map((n) => `anuj+producer${n}@gem.studio`)
const EMAILS = positional.length > 0 ? positional : DEFAULT_EMAILS

function genPassword() {
  // 16-char alphanumeric — easy to copy/paste, hard to brute-force.
  return crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16)
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function createProducer(email) {
  const password = FIXED_PASSWORD || genPassword()
  const fullName = email.split('@')[0]

  // Check if user already exists — list and find by email. Supabase
  // doesn't expose a get-by-email admin endpoint cleanly, so we paginate
  // listUsers up to a generous bound.
  let existingUser = null
  let page = 1
  while (page < 20) {
    const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (!list || list.users.length === 0) break
    existingUser = list.users.find((u) => u.email === email) || null
    if (existingUser) break
    if (list.users.length < 200) break
    page++
  }

  if (existingUser) {
    if (DRY) {
      console.log(`  · ${email} already exists (id=${existingUser.id.slice(0, 8)}). Would skip.`)
      return { email, ok: true, action: 'exists', userId: existingUser.id, password: null }
    }
    // Just ensure account_type=producer + email confirmed.
    if (!existingUser.email_confirmed_at) {
      await supabase.auth.admin.updateUserById(existingUser.id, { email_confirm: true })
    }
    const { error: profErr } = await supabase
      .from('profiles')
      .update({ account_type: 'producer', full_name: fullName })
      .eq('id', existingUser.id)
    if (profErr) {
      console.log(`  ✗ ${email} exists but profile update failed: ${profErr.message}`)
      return { email, ok: false, action: 'profile-update-failed', error: profErr.message }
    }
    console.log(`  · ${email} already existed — promoted to producer`)
    return { email, ok: true, action: 'promoted-existing', userId: existingUser.id, password: null }
  }

  if (DRY) {
    console.log(`  + ${email} (would create with auto-password)`)
    return { email, ok: true, action: 'dry', password: null }
  }

  // Create the auth user
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip the confirm email — these are vetted invites.
    user_metadata: { full_name: fullName },
  })
  if (createErr || !created.user) {
    console.log(`  ✗ ${email} create failed: ${createErr?.message || 'no user returned'}`)
    return { email, ok: false, action: 'auth-create-failed', error: createErr?.message }
  }

  // Promote profile to producer. The auth trigger should already have
  // inserted the row with default account_type='writer' — we flip it.
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ account_type: 'producer', full_name: fullName })
    .eq('id', created.user.id)
  if (profErr) {
    console.log(`  ✗ ${email} profile promote failed: ${profErr.message}`)
    return { email, ok: false, action: 'profile-promote-failed', error: profErr.message }
  }

  console.log(`  ✓ ${email} created (id=${created.user.id.slice(0, 8)})`)
  return { email, ok: true, action: 'created', userId: created.user.id, password }
}

console.log(`Producer account create${DRY ? ' (DRY RUN)' : ''}`)
console.log(`Emails: ${EMAILS.join(', ')}\n`)

const results = []
for (const email of EMAILS) {
  const r = await createProducer(email)
  results.push(r)
}

console.log('\n— summary —')
console.log('email                                 | action               | password')
console.log('--------------------------------------+----------------------+--------------------')
for (const r of results) {
  const e = r.email.padEnd(38)
  const a = (r.action || (r.ok ? 'ok' : 'failed')).padEnd(20)
  const p = r.password ?? (r.action === 'created' ? '(see above)' : '—')
  console.log(`${e} | ${a} | ${p}`)
}

console.log('\nNext: log in as each at https://www.gem.studio/login, complete /onboarding/producer to set lane (genre/format/budget). Matching activates once lane is set.')

const failed = results.filter((r) => !r.ok)
if (failed.length > 0) process.exit(1)
