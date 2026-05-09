#!/usr/bin/env node
/**
 * Broadcast: May 2026 product update — portfolio review simplification
 * + script flow cleanup. Goes to ALL users (active, trialing, AND
 * free/cancelled — anyone with an email in profiles).
 *
 * Template: content/email-templates/may_2026_update.md
 *
 * Modes:
 *   (default)   dry run — print cohort + preview, no sends
 *   --test      send ONE email to anuj@gem.studio with [TEST] subject
 *   --send      fire the full cohort
 *
 * Dedupe: scripts/broadcast-may-2026-update-log.json
 *
 * Run from gem-app/:
 *   node scripts/broadcast-may-2026-update.mjs           # dry run
 *   node scripts/broadcast-may-2026-update.mjs --test    # test send
 *   node scripts/broadcast-may-2026-update.mjs --send    # live broadcast
 */
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

const TEST = process.argv.includes('--test')
const SEND = process.argv.includes('--send')
const DRY = !TEST && !SEND

const POSTMARK_TOKEN =
  process.env.POSTMARK_SERVER_TOKEN || 'f6a35ee7-7420-411c-9c85-cde607da9298'
const STREAM = 'outbound'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Load template (subject + html + text) ─────────────────────────
const TEMPLATE_PATH = path.join(
  process.cwd(),
  'content',
  'email-templates',
  'may_2026_update.md'
)
const tplRaw = fs.readFileSync(TEMPLATE_PATH, 'utf8')

function extractSection(src, marker) {
  const re = new RegExp(`<!--\\s*${marker}\\s*-->\\s*\\n([\\s\\S]*?)(?=\\n<!--|$)`, 'i')
  const m = src.match(re)
  return m ? m[1].trim() : ''
}

const SUBJECT_TPL = extractSection(tplRaw, 'SUBJECT')
const HTML_TPL = extractSection(tplRaw, 'HTML')
const TEXT_TPL = extractSection(tplRaw, 'TEXT')

if (!SUBJECT_TPL || !HTML_TPL || !TEXT_TPL) {
  console.error('Template parse failed — could not find SUBJECT / HTML / TEXT sections in', TEMPLATE_PATH)
  process.exit(1)
}

// ── Cohort: ALL users with an email, excluding internal @gem.studio
const { data: rows, error: qErr } = await sb
  .from('profiles')
  .select('id, email, full_name, subscription_status')
  .not('email', 'is', null)

if (qErr) {
  console.error('Query failed:', qErr)
  process.exit(1)
}

const seen = new Set()
const cohort = []
for (const r of rows ?? []) {
  const email = (r.email || '').trim()
  if (!email) continue
  if (email.toLowerCase().endsWith('@gem.studio')) continue
  if (seen.has(email.toLowerCase())) continue
  seen.add(email.toLowerCase())
  cohort.push({
    email,
    name: r.full_name,
    status: r.subscription_status,
  })
}

const activeCount = cohort.filter((r) => r.status === 'active').length
const trialingCount = cohort.filter((r) => r.status === 'trialing').length
const otherCount = cohort.length - activeCount - trialingCount
console.log(`Cohort: ${cohort.length} unique recipients (active=${activeCount}, trialing=${trialingCount}, other=${otherCount})`)
if (cohort.length === 0) {
  console.error('Empty cohort — aborting.')
  process.exit(1)
}

// ── Helpers ─────────────────────────────────────────────────────────
function firstName(fullName, emailAddr) {
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)
  const fn = (fullName ?? '').trim().split(/\s+/)[0]
  if (fn) return cap(fn)
  const local = (emailAddr ?? '').split('@')[0]
  return cap(local) || 'there'
}

function render(template, fn) {
  return template.replaceAll('{{first_name}}', fn)
}

// ── Preview first 3 recipients ────────────────────────────────────
console.log('\nFirst 3 recipients (preview):')
for (const r of cohort.slice(0, 3)) {
  const fn = firstName(r.name, r.email)
  console.log(`  → ${r.email}   (first_name=${fn}, status=${r.status})`)
}
if (cohort.length > 3) console.log(`  ... and ${cohort.length - 3} more`)
console.log(`\nSubject: ${SUBJECT_TPL}`)
console.log()

const TAG = 'may-2026-update'

async function postOne({ to, subject, html, text, tag }) {
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': POSTMARK_TOKEN,
    },
    body: JSON.stringify({
      From: 'Anuj from GEM <anuj@gem.studio>',
      ReplyTo: 'anuj@gem.studio',
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      MessageStream: STREAM,
      TrackOpens: true,
      TrackLinks: 'HtmlOnly',
      Tag: tag,
    }),
  })
  const json = await res.json()
  return { ok: res.ok && json.MessageID, json, status: res.status }
}

// ── TEST MODE: single email to anuj@gem.studio ───────────────────
if (TEST) {
  const fn = 'Anuj'
  const r = await postOne({
    to: 'anuj@gem.studio',
    subject: `[TEST] ${render(SUBJECT_TPL, fn)}`,
    html: render(HTML_TPL, fn),
    text: render(TEXT_TPL, fn),
    tag: `${TAG}-test`,
  })
  if (r.ok) {
    console.log(`[TEST] ✓ Sent to anuj@gem.studio (MessageID: ${r.json.MessageID})`)
  } else {
    console.error(`[TEST] ✗ Failed (${r.status}):`, r.json)
    process.exit(1)
  }
  process.exit(0)
}

if (DRY) {
  console.log('DRY RUN — no emails sent.')
  console.log('  --test  → send ONE test email to anuj@gem.studio')
  console.log('  --send  → fire to full cohort')
  process.exit(0)
}

// ── SEND MODE ─────────────────────────────────────────────────────
const SEND_LOG = path.join(
  process.cwd(),
  'scripts',
  'broadcast-may-2026-update-log.json'
)
let log = {}
try {
  if (fs.existsSync(SEND_LOG)) log = JSON.parse(fs.readFileSync(SEND_LOG, 'utf8'))
} catch {}

let sent = 0
let failed = 0
let skipped = 0
for (const r of cohort) {
  const emailKey = r.email.toLowerCase()
  if (log[emailKey]) {
    skipped++
    continue
  }
  const fn = firstName(r.name, r.email)
  try {
    const result = await postOne({
      to: r.email,
      subject: render(SUBJECT_TPL, fn),
      html: render(HTML_TPL, fn),
      text: render(TEXT_TPL, fn),
      tag: TAG,
    })
    if (result.ok) {
      sent++
      log[emailKey] = {
        first_name: fn,
        status: r.status,
        message_id: result.json.MessageID,
        sent_at: new Date().toISOString(),
      }
      fs.writeFileSync(SEND_LOG, JSON.stringify(log, null, 2))
      if (sent % 10 === 0) console.log(`  [${sent}] last=${r.email}`)
    } else {
      failed++
      console.error(`  ✗ Failed ${r.email} (${result.status}):`, result.json)
    }
  } catch (err) {
    failed++
    console.error(`  ✗ Error ${r.email}:`, err.message)
  }
  await new Promise((res) => setTimeout(res, 60))
}

console.log(`\nDone. sent=${sent} failed=${failed} skipped=${skipped}`)
console.log(`Log: ${path.relative(process.cwd(), SEND_LOG)}`)
