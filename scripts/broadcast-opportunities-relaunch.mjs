#!/usr/bin/env node
/**
 * Broadcast: opportunities relaunch — "We changed how reviews work."
 * Goes to ALL users with an email, excluding internal @gem.studio.
 *
 * HTML is inline — no template file needed.
 *
 * Modes:
 *   (default)   dry run — print cohort + preview, no sends
 *   --test      send ONE email to anuj@gem.studio with [TEST] subject
 *   --send      fire the full cohort
 *
 * Dedupe: scripts/broadcast-opportunities-relaunch-log.json
 *
 * Run from gem-app/:
 *   node scripts/broadcast-opportunities-relaunch.mjs           # dry run
 *   node scripts/broadcast-opportunities-relaunch.mjs --test    # test send
 *   node scripts/broadcast-opportunities-relaunch.mjs --send    # live broadcast
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

// ── Subject ───────────────────────────────────────────────────────
const SUBJECT = 'We changed how reviews work'

// ── HTML (inline) ─────────────────────────────────────────────────
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
              <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:800;margin-bottom:14px;">What's new on GEM</div>
              <div style="font-size:30px;line-height:1.12;color:#ffffff;font-weight:800;letter-spacing:-0.02em;margin-bottom:14px;">We changed how reviews work.</div>
              <div style="font-size:16px;line-height:1.4;color:rgba(255,255,255,0.92);font-weight:500;">Faster feedback, tailored to each opportunity.</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 12px;">
              <p style="font-size:15px;color:#111827;line-height:1.55;margin:0 0 14px;font-weight:600;">Hey ${firstName},</p>
              <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 14px;">We've gone through a lot of portfolio reviews over the past few weeks. People have been really pleased by the feedback and the traction their scripts are getting &mdash; and that's been great to see.</p>
              <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 14px;">But we've also heard some real issues. The process is too slow. It takes too long for partners to weigh in, and the feedback you get back isn't always specific enough to be useful. A general portfolio review just doesn't give you the kind of pointed, actionable response you need.</p>
              <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 24px;">So we're doing things differently.</p>
            </td>
          </tr>

          <!-- Priority note -->
          <tr>
            <td style="padding:0 36px 24px;">
              <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:14px;padding:20px 24px;">
                <p style="font-size:15px;color:#111827;line-height:1.6;margin:0;"><strong style="color:#991b1b;">If you submitted a portfolio for review and haven't heard back yet, we're sorry.</strong> You'll be prioritized in the new system. When you apply to an opportunity, you'll be considered first. We're going to get to you as fast as we can.</p>
              </div>
            </td>
          </tr>

          <!-- Change 1 -->
          <tr>
            <td style="padding:0 36px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;border-radius:14px;border:1px solid #ddd6fe;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:10px;letter-spacing:-0.02em;line-height:1.2;">Apply to specific opportunities</div>
                    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">Instead of one big portfolio review, you now apply to individual open calls &mdash; one script at a time. Each call has its own criteria, and the feedback you get back is tailored to that specific opportunity. Because each review is focused, the whole thing moves a lot faster.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Change 2 -->
          <tr>
            <td style="padding:0 36px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ecfdf5;border-radius:14px;border:1px solid #a7f3d0;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:10px;letter-spacing:-0.02em;line-height:1.2;">8 open calls live now</div>
                    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">We've added new opportunities and reworked the existing ones. Producers and lit reps across drama, comedy, genre, and more are actively looking. Check which ones your scripts qualify for.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Change 3 -->
          <tr>
            <td style="padding:0 36px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border-radius:14px;border:1px solid #fde68a;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:10px;letter-spacing:-0.02em;line-height:1.2;">Unlimited reports for free users</div>
                    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">We lifted the cap. Upload as many scripts as you want, get a full evaluation on each one, and your work can still be discovered by our partners. Applying to open calls and getting tailored feedback is a GEM Pro feature ($20/mo).</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:8px 36px 28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#7c3aed" style="border-radius:12px;box-shadow:0 4px 14px rgba(124,58,237,0.35);">
                    <a href="https://www.gem.studio/dashboard" style="display:inline-block;padding:16px 36px;font-size:15.5px;color:#ffffff;font-weight:800;text-decoration:none;letter-spacing:-0.01em;">Check it out &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Closer -->
          <tr>
            <td style="padding:0 36px 36px;">
              <div style="border-top:1px solid #e5e7eb;padding-top:22px;">
                <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 16px;">Questions? Reply here. Always happy to chat.</p>
                <p style="font-size:14px;color:#111827;line-height:1.5;margin:0;font-weight:600;">&mdash; Anuj<br><span style="color:#9ca3af;font-weight:400;">Founder, GEM</span></p>
              </div>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;margin-top:16px;">
          <tr>
            <td align="center" style="padding:16px;font-size:12px;color:#9ca3af;line-height:1.5;">
              GEM &middot; Built for screenwriters &middot; <a href="https://www.gem.studio" style="color:#9ca3af;text-decoration:underline;">gem.studio</a>
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

We've gone through a lot of portfolio reviews over the past few weeks. People have been really pleased by the feedback and the traction their scripts are getting -- and that's been great to see.

But we've also heard some real issues. The process is too slow. It takes too long for partners to weigh in, and the feedback you get back isn't always specific enough to be useful.

So we're doing things differently.

IF YOU SUBMITTED A PORTFOLIO FOR REVIEW AND HAVEN'T HEARD BACK YET, WE'RE SORRY. You'll be prioritized in the new system. When you apply to an opportunity, you'll be considered first. We're going to get to you as fast as we can.

APPLY TO SPECIFIC OPPORTUNITIES
Instead of one big portfolio review, you now apply to individual open calls -- one script at a time. Each call has its own criteria, and the feedback you get back is tailored to that specific opportunity. Because each review is focused, the whole thing moves a lot faster.

8 OPEN CALLS LIVE NOW
We've added new opportunities and reworked the existing ones. Producers and lit reps across drama, comedy, genre, and more are actively looking.

UNLIMITED REPORTS FOR FREE USERS
We lifted the cap. Upload as many scripts as you want, get a full evaluation on each one, and your work can still be discovered by our partners. Applying to open calls and getting tailored feedback is a GEM Pro feature ($20/mo).

Check it out: https://www.gem.studio/dashboard

Questions? Reply here. Always happy to chat.

-- Anuj
Founder, GEM`
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

// ── Preview first 3 recipients ────────────────────────────────────
console.log('\nFirst 3 recipients (preview):')
for (const r of cohort.slice(0, 3)) {
  const fn = firstName(r.name, r.email)
  console.log(`  -> ${r.email}   (first_name=${fn}, status=${r.status})`)
}
if (cohort.length > 3) console.log(`  ... and ${cohort.length - 3} more`)
console.log(`\nSubject: ${SUBJECT}`)
console.log()

const TAG = 'opportunities-relaunch-may-2026'

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

// ── SEND MODE ─────────────────────────────────────────────────────
const SEND_LOG = path.join(
  process.cwd(),
  'scripts',
  'broadcast-opportunities-relaunch-log.json'
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
