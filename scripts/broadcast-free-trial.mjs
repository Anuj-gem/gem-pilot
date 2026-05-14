#!/usr/bin/env node
/**
 * Broadcast: 7-day free trial announcement to free users.
 * Target: free/canceled/past_due users who haven't already trialed.
 * Excludes unsubscribed and @gem.studio.
 *
 * Modes:
 *   (default)   dry run — print cohort + preview, no sends
 *   --test      send ONE email to anuj@gem.studio with [TEST] subject
 *   --send      fire the full cohort
 *
 * Run from gem-app/:
 *   node scripts/broadcast-free-trial.mjs
 *   node scripts/broadcast-free-trial.mjs --test
 *   node scripts/broadcast-free-trial.mjs --send
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
const STREAM = 'broadcast'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Subject ───────────────────────────────────────────────────────
const SUBJECT = 'Your 7-day GEM membership is ready'

// ── HTML ──────────────────────────────────────────────────────────
function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;background:#f3f4f6;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,0.08);">

          <!-- Hero -->
          <tr>
            <td style="padding:44px 36px 40px;background:linear-gradient(135deg,#5b21b6 0%,#7c3aed 50%,#a855f7 100%);">
              <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:800;margin-bottom:14px;">New</div>
              <div style="font-size:30px;line-height:1.12;color:#ffffff;font-weight:800;letter-spacing:-0.02em;margin-bottom:14px;">7 days of GEM. On us.</div>
              <div style="font-size:16px;line-height:1.4;color:rgba(255,255,255,0.92);font-weight:500;">Everything a full member gets. Free for a week.</div>
            </td>
          </tr>

          <!-- Message from Anuj + CTA -->
          <tr>
            <td style="padding:32px 36px 28px;">
              <p style="font-size:15px;color:#111827;line-height:1.55;margin:0 0 14px;font-weight:600;">Hey ${firstName},</p>
              <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 14px;">We're expanding access to GEM. You can now try a full GEM membership free for 7 days &mdash; everything a paid member gets. After that, you'll still be able to upload scripts and get reports for free like you do now.</p>
              <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 24px;">If you have any questions, just reply here and I'll get back to you.</p>
              <p style="font-size:14px;color:#111827;line-height:1.5;margin:0 0 28px;font-weight:600;">&mdash; Anuj<br><span style="color:#9ca3af;font-weight:400;">Founder, GEM</span></p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="#7c3aed" style="border-radius:12px;box-shadow:0 4px 14px rgba(124,58,237,0.35);">
                    <a href="https://www.gem.studio/dashboard" style="display:inline-block;padding:16px 36px;font-size:15.5px;color:#ffffff;font-weight:800;text-decoration:none;letter-spacing:-0.01em;">Start your free week &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;"><div style="border-top:1px solid #e5e7eb;"></div></td>
          </tr>

          <!-- Card 1: Apply -->
          <tr>
            <td style="padding:24px 36px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;border-radius:14px;border:1px solid #ddd6fe;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:10px;letter-spacing:-0.02em;line-height:1.2;">Apply for open calls</div>
                    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">Producers and reps are actively looking for scripts. See which opportunities your work qualifies for and apply directly.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card 2: Heat score -->
          <tr>
            <td style="padding:0 36px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ecfdf5;border-radius:14px;border:1px solid #a7f3d0;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:10px;letter-spacing:-0.02em;line-height:1.2;">Build your heat score</div>
                    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">Apply, get feedback, and climb. Your heat score reflects how active and competitive your work is on the platform.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card 3: Feedback -->
          <tr>
            <td style="padding:0 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border-radius:14px;border:1px solid #fde68a;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:10px;letter-spacing:-0.02em;line-height:1.2;">Get real feedback</div>
                    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">Every application gets a response. You'll know where you stand and what to work on &mdash; specific to what reviewers are looking for.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;margin-top:16px;">
          <tr>
            <td align="center" style="padding:16px;font-size:12px;color:#9ca3af;line-height:1.5;">
              GEM &middot; Built for screenwriters &middot; <a href="https://www.gem.studio" style="color:#9ca3af;text-decoration:underline;">gem.studio</a><br>
              <a href="https://www.gem.studio/unsubscribe" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Plain text ────────────────────────────────────────────────────
function buildText(firstName) {
  return `Hey ${firstName},

We're expanding access to GEM. You can now try a full GEM membership free for 7 days -- everything a paid member gets. After that, you'll still be able to upload scripts and get reports for free like you do now.

If you have any questions, just reply here and I'll get back to you.

-- Anuj
Founder, GEM

Start your free week: https://www.gem.studio/dashboard

---

APPLY FOR OPEN CALLS
Producers and reps are actively looking for scripts. See which opportunities your work qualifies for and apply directly.

BUILD YOUR HEAT SCORE
Apply, get feedback, and climb. Your heat score reflects how active and competitive your work is on the platform.

GET REAL FEEDBACK
Every application gets a response. You'll know where you stand and what to work on -- specific to what reviewers are looking for.

Unsubscribe: https://www.gem.studio/unsubscribe`
}

// ── Cohort: free/canceled/past_due who haven't trialed ───────────
const { data: rows, error: qErr } = await sb
  .from('profiles')
  .select('id, email, full_name, subscription_status, trial_ends_at, email_unsubscribed')
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
  if (r.email_unsubscribed) continue
  if (r.subscription_status === 'active') continue      // already paying
  if (r.subscription_status === 'trialing') continue     // already trialing
  if (r.trial_ends_at) continue                          // already used trial
  if (seen.has(email.toLowerCase())) continue
  seen.add(email.toLowerCase())
  cohort.push({
    email,
    name: r.full_name,
    status: r.subscription_status,
  })
}

console.log(`Cohort: ${cohort.length} eligible free users (no prior trial, not unsubscribed)`)
if (cohort.length === 0) {
  console.error('Empty cohort -- aborting.')
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

// ── Preview ──────────────────────────────────────────────────────
console.log('\nFirst 5 recipients:')
for (const r of cohort.slice(0, 5)) {
  const fn = firstName(r.name, r.email)
  console.log(`  -> ${r.email}  (${fn}, status=${r.status})`)
}
if (cohort.length > 5) console.log(`  ... and ${cohort.length - 5} more`)
console.log(`\nSubject: ${SUBJECT}`)
console.log()

const TAG = 'free-trial-announcement-may-2026'

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

// ── TEST MODE ────────────────────────────────────────────────────
if (TEST) {
  const fn = 'Anuj'
  const r = await postOne({
    to: 'anuj@gem.studio',
    subject: `[TEST] ${SUBJECT}`,
    html: buildHtml(fn),
    text: buildText(fn),
    tag: `${TAG}-test`,
  })
  if (r.ok) {
    console.log(`[TEST] sent to anuj@gem.studio (MessageID: ${r.json.MessageID})`)
  } else {
    console.error(`[TEST] Failed (${r.status}):`, r.json)
    process.exit(1)
  }
  process.exit(0)
}

if (DRY) {
  console.log('DRY RUN -- no emails sent.')
  console.log('  --test  -> send ONE test email to anuj@gem.studio')
  console.log('  --send  -> fire to full cohort')
  process.exit(0)
}

// ── SEND MODE ────────────────────────────────────────────────────
const SEND_LOG = path.join(
  process.cwd(),
  'scripts',
  'broadcast-free-trial-log.json'
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
      subject: SUBJECT,
      html: buildHtml(fn),
      text: buildText(fn),
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
