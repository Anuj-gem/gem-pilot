#!/usr/bin/env node
/**
 * Broadcast: "We back filmmakers, not ideas" — effort manifesto to the writer community.
 * Target: ALL profiles with an email (the writer community).
 * Excludes unsubscribed and @gem.studio (internal).
 *
 * Modes:
 *   (default)   dry run — print cohort + preview, no sends
 *   --test      send ONE email to anuj@gem.studio with [TEST] subject
 *   --send      fire the full cohort
 *
 * Run from gem-app/ (so it can read .env.local):
 *   node ../GEM/broadcast-effort.mjs
 *   node ../GEM/broadcast-effort.mjs --test
 *   node ../GEM/broadcast-effort.mjs --send
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

const SUBJECT = 'We back filmmakers, not ideas'
const TAG = 'effort-manifesto-june-2026'

// ── Body paragraphs (shared by HTML + text) ───────────────────────
function paragraphs(firstName) {
  return [
    `Hi ${firstName},`,
    `I'm going to be blunt, because too many applications tell me people don't get what GEM is.`,
    `When you submit to GEM, you're not entering a contest to be discovered. You're applying for money. Real money &mdash; six figures into a project, then us convincing our network to put six or seven figures more behind it. Every application is really answering one question: why is backing this a smart investment? If you haven't thought about that, you haven't applied. You've uploaded a file.`,
    `You don't have to be a writer-director who does everything &mdash; we can help you find collaborators and talent. What we can't supply is will. We back writers with skill and will, who treat filmmaking as a craft and a business, not a lottery. In a lot of cases we're betting on the person as much as the idea &mdash; someone who can carry a project to a finished film and a return, not just someone with a good premise.`,
    `Here's the honest part. We give you every chance to make your case: revenue projections, a budget assessment we prepare for you, room to show your proof of concept, your collaborators, how the project is positioned. Most of you use none of it. The only effort a lot of people put in is upload, read the report, hit apply. We made it that easy on purpose &mdash; but easy isn't enough, and when the effort is that thin, we see it and we hold it against you. Hard.`,
    `And if those tools are missing something you need to make your case, tell me. Plenty of you aren't shy with feedback, and I want it &mdash; this is a free tool, but the better it serves you, the better we can evaluate your work, so we'll keep improving it. That's the two-way street. What isn't negotiable is effort.`,
    `Because effort is effort. A draft script takes thirty seconds to produce now. The old model &mdash; write something and wait to be plucked out of the void &mdash; is over, and it's not coming back. What moves us is you proving, in your application or on the phone with me, that this is worth real money: your script, your proof of concept, your plan, your grasp of how an investor actually gets paid back. That's a massive part of the decision.`,
    `I come from the startup world. A founder who asks for investment but can't tell you how they'll return the capital &mdash; or how they'll survive the risks that kill most projects &mdash; doesn't get funded. Same here. I know it's grim that art has to turn into dollars and cents, but the moment you want to take a script to a finished film, you're dealing with people like us putting money behind it. Treat it as seriously as if it were your own money on the line. A lot of you only see the part where you get famous &mdash; not the craft it takes to get there, and today that craft includes understanding the people on the other side of the check and making a case that convinces them.`,
    `Once in a while a script is undeniable on its own, and we'll make exceptions. But unless you're certain yours is that kind, assume it isn't, and do the work.`,
    `Two things, plainly. You all have my email &mdash; write to supplement your application, or ask what we're looking for. Most of you won't, but the door is open. And if you send a low-effort application, you'll get a low-effort pass and no feedback. That's not us being cold; it's us matching the effort you brought.`,
    `So get used to this: you're welcome to use our tools, and you're welcome to apply &mdash; but you will not get anywhere with us unless you put in the work. Bring me real insight and a real plan and I'll go to bat for you harder than anyone. Bring me nothing and there's nothing to talk about.`,
  ]
}

// ── HTML (simple letter, light theme, minimal purple) ─────────────
function buildHtml(firstName) {
  const ps = paragraphs(firstName)
  const greeting = ps[0]
  const body = ps
    .slice(1)
    .map(
      (p) =>
        `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 18px;">${p}</p>`
    )
    .join('\n')
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
          <tr>
            <td style="padding:40px 40px 8px;">
              <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#7c3aed;font-weight:800;margin-bottom:18px;">A note from GEM</div>
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:#111827;margin:0 0 24px;">We back filmmakers, not ideas.</h1>
              <p style="font-size:15px;color:#111827;line-height:1.6;margin:0 0 18px;font-weight:600;">${greeting}</p>
              ${body}
              <p style="font-size:15px;color:#111827;line-height:1.5;margin:8px 0 36px;font-weight:600;">&mdash; Anuj<br><span style="color:#9ca3af;font-weight:400;">Founder, GEM</span></p>
            </td>
          </tr>
        </table>
        <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;margin-top:16px;">
          <tr>
            <td align="center" style="padding:16px;font-size:12px;color:#9ca3af;line-height:1.5;">
              GEM &middot; <a href="https://www.gem.studio" style="color:#9ca3af;text-decoration:underline;">gem.studio</a><br>
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
  const ps = paragraphs(firstName).map((p) =>
    p.replace(/&mdash;/g, '--')
  )
  return (
    ps.join('\n\n') +
    `\n\n-- Anuj\nFounder, GEM\n\nUnsubscribe: https://www.gem.studio/unsubscribe`
  )
}

// ── Cohort: all profiles with an email, minus unsubscribed + internal ─
const { data: rows, error: qErr } = await sb
  .from('profiles')
  .select('id, email, full_name, email_unsubscribed')
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
  if (seen.has(email.toLowerCase())) continue
  seen.add(email.toLowerCase())
  cohort.push({ email, name: r.full_name })
}

console.log(`Cohort: ${cohort.length} recipients (all writers, minus unsubscribed + internal)`)
if (cohort.length === 0) {
  console.error('Empty cohort -- aborting.')
  process.exit(1)
}

function firstName(fullName, emailAddr) {
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)
  const fn = (fullName ?? '').trim().split(/\s+/)[0]
  if (fn) return cap(fn)
  const local = (emailAddr ?? '').split('@')[0]
  return cap(local) || 'there'
}

console.log('\nFirst 5 recipients:')
for (const r of cohort.slice(0, 5)) {
  console.log(`  -> ${r.email}  (${firstName(r.name, r.email)})`)
}
if (cohort.length > 5) console.log(`  ... and ${cohort.length - 5} more`)
console.log(`\nSubject: ${SUBJECT}\n`)

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
const SEND_LOG = path.join(process.cwd(), 'broadcast-effort-log.json')
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
      log[emailKey] = { first_name: fn, message_id: result.json.MessageID, sent_at: new Date().toISOString() }
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
