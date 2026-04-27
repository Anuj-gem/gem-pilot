#!/usr/bin/env node
/**
 * One-off broadcast: notify impacted users that their reports were re-scored
 * on Selznick 3.6.
 *
 * Cohort: every non-@gem.studio user who had at least one report re-scored
 * (model LIKE '%rescore%') and still has a viewable submission (file_url NOT NULL).
 *
 * Send: Postmark /email endpoint, one-at-a-time, MessageStream = outbound
 * (matches the pattern in marketing/announcement_send_*.py).
 *
 * Modes:
 *   --dry     print cohort + preview, no sends                    (default)
 *   --test    send ONE email to anuj@gem.studio with [TEST] subject
 *   --send    fire the full cohort
 *
 * Dedupe: email_outbox upsert on (template_alias, dedupe_key) so re-runs skip.
 *
 * Run from gem-app/:
 *   node scripts/broadcast-selznick-3-6.mjs                 # dry run
 *   node scripts/broadcast-selznick-3-6.mjs --test          # test to anuj@gem.studio
 *   node scripts/broadcast-selznick-3-6.mjs --send          # real send to cohort
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

// Hardcoded Postmark token — matches marketing/announcement_send_*.py pattern.
const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN || 'f6a35ee7-7420-411c-9c85-cde607da9298'
const STREAM = 'outbound'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gem.studio'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Cohort query: 128 impacted external users ─────────────────────
const { data: rows, error: qErr } = await sb
  .from('script_submissions')
  .select('user_id, script_evaluations!inner(model), profiles:user_id(email, full_name)')
  .not('file_url', 'is', null)
  .like('script_evaluations.model', '%rescore%')

if (qErr) {
  console.error('Query failed:', qErr)
  process.exit(1)
}

// Dedupe by email, exclude @gem.studio
const seen = new Set()
const cohort = []
for (const r of rows ?? []) {
  const email = r.profiles?.email
  const name = r.profiles?.full_name
  if (!email || email.toLowerCase().endsWith('@gem.studio')) continue
  if (seen.has(email.toLowerCase())) continue
  seen.add(email.toLowerCase())
  cohort.push({ email, name })
}

console.log(`Cohort size: ${cohort.length} users`)
if (cohort.length === 0) {
  console.error('Empty cohort — aborting.')
  process.exit(1)
}

// ── Message template ─────────────────────────────────────────────
const SUBJECT = 'GEM: Your script report is now fully re-scored with Selznick 3.6'

function firstName(fullName, emailAddr) {
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)
  const fn = (fullName ?? '').trim().split(/\s+/)[0]
  if (fn) return cap(fn)
  const local = (emailAddr ?? '').split('@')[0]
  return cap(local) || 'there'
}

function htmlBody(fn) {
  return `<!doctype html>
<html>
<body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#111;max-width:560px;margin:0 auto;padding:24px;">
<p>Hey ${fn},</p>

<p>We just released Selznick 3.6 &mdash; a meaningful upgrade to how GEM reads and reports on scripts. Sharper character breakdowns, stronger director and packaging angles, cleaner positioning.</p>

<p>As part of the release, we re-ran every report you&rsquo;ve submitted on the new model. Your scores, character sections, and package angles should all look tighter than before.</p>

<p style="margin:28px 0;">
  <a href="${APP_URL}/dashboard" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">See your updated reports &rarr;</a>
</p>

<p>A heads-up: transitions like this can surface small bugs. If anything looks off on any of your reports &mdash; a missing character, a section that didn&rsquo;t render, a score that doesn&rsquo;t track &mdash; just hit reply and let me know. I&rsquo;ll fix it right away.</p>

<p>&mdash; Anuj<br/>Founder, GEM</p>
</body>
</html>`
}

function textBody(fn) {
  return `Hey ${fn},

We just released Selznick 3.6 — a meaningful upgrade to how GEM reads and reports on scripts. Sharper character breakdowns, stronger director and packaging angles, cleaner positioning.

As part of the release, we re-ran every report you've submitted on the new model. Your scores, character sections, and package angles should all look tighter than before.

See your updated reports: ${APP_URL}/dashboard

A heads-up: transitions like this can surface small bugs. If anything looks off on any of your reports — a missing character, a section that didn't render, a score that doesn't track — just hit reply and let me know. I'll fix it right away.

— Anuj
Founder, GEM
`
}

// ── Preview first 3 recipients ────────────────────────────────────
console.log('\nFirst 3 recipients (preview):')
for (const r of cohort.slice(0, 3)) {
  const fn = firstName(r.name, r.email)
  console.log(`  → ${r.email}   (first_name=${fn})`)
}
console.log(`  ... and ${Math.max(0, cohort.length - 3)} more\n`)

const TAG = 'selznick-3-6-rescore'
const DEDUPE_PREFIX = 'selznick-3-6-rescore'

// ── Postmark single-send helper ──────────────────────────────────
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
    subject: `[TEST] ${SUBJECT}`,
    html: htmlBody(fn),
    text: textBody(fn),
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

// ── SEND MODE: full cohort, one at a time ────────────────────────
// Dedupe via local JSON log — matches marketing/announcement_send_*.py pattern.
const SEND_LOG = path.join(process.cwd(), 'scripts', 'broadcast-selznick-3-6-log.json')
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
      subject: SUBJECT,
      html: htmlBody(fn),
      text: textBody(fn),
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
      console.error(`  ✗ ${r.email}: ${result.json.Message ?? result.status}`)
    }
  } catch (err) {
    failed++
    console.error(`  ✗ ${r.email}: ${err}`)
  }
  // gentle throttle to stay well under Postmark rate limits
  await new Promise((resolve) => setTimeout(resolve, 300))
}

console.log(`\nDone. Sent: ${sent} | Failed: ${failed} | Skipped (already sent): ${skipped}`)
console.log(`Log: ${SEND_LOG}`)
