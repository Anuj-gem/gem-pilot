#!/usr/bin/env node
/**
 * Broadcast: June 2026 relaunch — major product shift announcement.
 * Goes to ALL users (active, trialing, free, cancelled — anyone with
 * an email in profiles), excluding @gem.studio and unsubscribed users.
 *
 * Template: content/email-templates/june_2026_relaunch.md
 *
 * Modes:
 *   (default)   dry run — print cohort + preview, no sends
 *   --test      send ONE email to anuj@gem.studio with [TEST] subject
 *   --send      fire the full cohort
 *
 * Dedupe: scripts/broadcast-june-2026-relaunch-log.json
 *
 * Run from gem-app/:
 *   node scripts/broadcast-june-2026-relaunch.mjs           # dry run
 *   node scripts/broadcast-june-2026-relaunch.mjs --test    # test send
 *   node scripts/broadcast-june-2026-relaunch.mjs --send    # live broadcast
 */
import fs from 'node:fs'
import path from 'node:path'

const TEST = process.argv.includes('--test')
const SEND = process.argv.includes('--send')
const DRY = !TEST && !SEND

const POSTMARK_TOKEN = 'f6a35ee7-7420-411c-9c85-cde607da9298'
const STREAM = 'outbound'

// ── Load template (subject + html + text) ─────────────────────────
const TEMPLATE_PATH = path.join(
  process.cwd(),
  'content',
  'email-templates',
  'june_2026_relaunch.md'
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

// ── Cohort: loaded from local JSON (pre-exported from Supabase,
//    already filtered: no @gem.studio, no unsubscribed) ───────────
const COHORT_PATH = path.join(process.cwd(), 'scripts', 'broadcast-june-2026-cohort.json')
const rawCohort = JSON.parse(fs.readFileSync(COHORT_PATH, 'utf8'))

const seen = new Set()
const cohort = []
for (const r of rawCohort) {
  const email = (r.email || '').trim()
  if (!email) continue
  if (seen.has(email.toLowerCase())) continue
  seen.add(email.toLowerCase())
  cohort.push({ email, name: r.full_name })
}

console.log(`Cohort: ${cohort.length} unique recipients (from local JSON)`)
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

function render(template, fn, email) {
  return template.replaceAll('{{first_name}}', fn).replaceAll('{{email}}', email)
}

// ── Preview first 3 recipients ────────────────────────────────────
console.log('\nFirst 3 recipients (preview):')
for (const r of cohort.slice(0, 3)) {
  const fn = firstName(r.name, r.email)
  console.log(`  → ${r.email}   (first_name=${fn})`)
}
if (cohort.length > 3) console.log(`  ... and ${cohort.length - 3} more`)
console.log(`\nSubject: ${SUBJECT_TPL}`)
console.log()

const TAG = 'june-2026-relaunch'

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
  const testEmail = 'anuj@gem.studio'
  const r = await postOne({
    to: testEmail,
    subject: `[TEST] ${render(SUBJECT_TPL, fn, testEmail)}`,
    html: render(HTML_TPL, fn, testEmail),
    text: render(TEXT_TPL, fn, testEmail),
    tag: `${TAG}-test`,
  })
  if (r.ok) {
    console.log(`[TEST] Sent to anuj@gem.studio (MessageID: ${r.json.MessageID})`)
  } else {
    console.error(`[TEST] Failed (${r.status}):`, r.json)
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
  'broadcast-june-2026-relaunch-log.json'
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
      subject: render(SUBJECT_TPL, fn, r.email),
      html: render(HTML_TPL, fn, r.email),
      text: render(TEXT_TPL, fn, r.email),
      tag: TAG,
    })
    if (result.ok) {
      sent++
      log[emailKey] = {
        first_name: fn,
        message_id: result.json.MessageID,
        sent_at: new Date().toISOString(),
      }
      fs.writeFileSync(SEND_LOG, JSON.stringify(log, null, 2))
      if (sent % 10 === 0) console.log(`  [${sent}] last=${r.email}`)
    } else {
      failed++
      console.error(`  Failed ${r.email} (${result.status}):`, result.json)
    }
  } catch (err) {
    failed++
    console.error(`  Error ${r.email}:`, err.message)
  }
  await new Promise((res) => setTimeout(res, 60))
}

console.log(`\nDone. sent=${sent} failed=${failed} skipped=${skipped}`)
console.log(`Log: ${path.relative(process.cwd(), SEND_LOG)}`)
