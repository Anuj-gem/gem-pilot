#!/usr/bin/env node
/**
 * Broadcast: personalized trial-user opportunities email.
 * For each trialing user with completed scripts, runs the same
 * qualification logic as the opportunities page (format, genre,
 * budget tier, min score) and builds a personalized email showing
 * which of their scripts matched which opportunities.
 *
 * Only sends to users who have at least one qualifying match.
 *
 * Modes:
 *   (default)   dry run — print cohort + match stats, no sends
 *   --test      send ONE email to anuj@gem.studio with real match data
 *   --send      fire the full cohort
 *
 * Run from gem-app/:
 *   node scripts/broadcast-trial-opportunities.mjs
 *   node scripts/broadcast-trial-opportunities.mjs --test
 *   node scripts/broadcast-trial-opportunities.mjs --send
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

// ── Load template ─────────────────────────────────────────────────
const TEMPLATE_PATH = path.join(
  process.cwd(), 'content', 'email-templates', 'trial_opportunities_personal.md'
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
  console.error('Template parse failed')
  process.exit(1)
}

// ── Fetch active opportunities ────────────────────────────────────
const { data: opps } = await sb
  .from('opportunities')
  .select('id, title, slug, status, formats, genres, budget_tiers, min_score')
  .eq('status', 'active')

const opportunities = opps || []
console.log(`Active opportunities: ${opportunities.length}`)

// ── Fetch trial users ─────────────────────────────────────────────
const { data: trialProfiles } = await sb
  .from('profiles')
  .select('id, email, full_name, referral_code, subscription_status')
  .eq('subscription_status', 'trialing')
  .not('email', 'is', null)

const trialUsers = (trialProfiles || []).filter(
  (p) => p.email && !p.email.toLowerCase().endsWith('@gem.studio')
)
console.log(`Trial users (non-internal): ${trialUsers.length}`)

const userIds = trialUsers.map((u) => u.id)

// ── Fetch completed scripts + evals ───────────────────────────────
const { data: allScripts } = await sb
  .from('script_submissions')
  .select('id, user_id, title, declared_format')
  .in('user_id', userIds)
  .eq('status', 'completed')

const scripts = allScripts || []
const scriptIds = scripts.map((s) => s.id)
console.log(`Completed scripts from trial users: ${scripts.length}`)

// Fetch evals for all these scripts
let evalMap = new Map() // submission_id → { weighted_score, genre, budget }
if (scriptIds.length > 0) {
  // Supabase .in() has a limit, batch if needed
  const BATCH = 200
  for (let i = 0; i < scriptIds.length; i += BATCH) {
    const batch = scriptIds.slice(i, i + BATCH)
    const { data: evals } = await sb
      .from('script_evaluations')
      .select('submission_id, weighted_score, evaluation')
      .in('submission_id', batch)

    for (const ev of (evals || [])) {
      const evJson = ev.evaluation
      const cls = (evJson?.classification) || {}
      const fmt = (evJson?.format_detection) || {}
      const genre = ((cls.genre_primary) || (fmt.genre_primary) || '')
        .toLowerCase().replace(/[^a-z-]/g, '') || null
      const packaging = (evJson?.packaging) || {}
      const budgetTier = packaging.budget_tier
      const budget = (budgetTier?.tier)?.toLowerCase() ?? null

      evalMap.set(ev.submission_id, {
        weighted_score: ev.weighted_score,
        genre,
        budget,
      })
    }
  }
}
console.log(`Evals loaded: ${evalMap.size}`)

// ── Run qualification matching ────────────────────────────────────
// For each user, find which scripts match which opportunities
// Result: Map<userId, Array<{ script, matchingOpps[] }>>

function qualifies(script, ev, opp) {
  if (opp.formats?.length > 0 && !opp.formats.includes(script.declared_format)) return false
  if (opp.genres?.length > 0 && ev.genre && !opp.genres.includes(ev.genre)) return false
  if (opp.budget_tiers?.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) return false
  if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) return false
  return true
}

// Group scripts by user
const scriptsByUser = new Map()
for (const s of scripts) {
  if (!scriptsByUser.has(s.user_id)) scriptsByUser.set(s.user_id, [])
  scriptsByUser.get(s.user_id).push(s)
}

// Build matches per user
// matchesByUser: Map<userId, Array<{ scriptTitle, matchingOppTitles[] }>>
const matchesByUser = new Map()

for (const [userId, userScripts] of scriptsByUser) {
  const scriptMatches = []
  for (const script of userScripts) {
    const ev = evalMap.get(script.id)
    if (!ev) continue
    const matching = opportunities.filter((opp) => qualifies(script, ev, opp))
    if (matching.length > 0) {
      scriptMatches.push({
        scriptTitle: script.title,
        matchingOpps: matching.map((o) => o.title),
        matchCount: matching.length,
      })
    }
  }
  if (scriptMatches.length > 0) {
    // Sort: most matches first
    scriptMatches.sort((a, b) => b.matchCount - a.matchCount)
    matchesByUser.set(userId, scriptMatches)
  }
}

// Build final cohort: only users with at least one match
const cohort = trialUsers.filter((u) => matchesByUser.has(u.id))
console.log(`\nCohort (trial users with qualifying matches): ${cohort.length}`)

if (cohort.length === 0) {
  console.error('No users with qualifying matches — aborting.')
  process.exit(1)
}

// Stats
let totalMatches = 0
for (const [, matches] of matchesByUser) {
  totalMatches += matches.length
}
console.log(`Total script→opportunity matches: ${totalMatches}`)

// ── Helpers ─────────────────────────────────────────────────────────
function firstName(fullName, emailAddr) {
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)
  const fn = (fullName ?? '').trim().split(/\s+/)[0]
  if (fn) return cap(fn)
  const local = (emailAddr ?? '').split('@')[0]
  return cap(local) || 'there'
}

function escHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildMatchCardsHtml(scriptMatches) {
  // Show the first script with its matching opp name, then summarize the rest
  let html = ''

  // Featured match: first script + first opportunity name
  const featured = scriptMatches[0]
  html += `<div style="background: #fff; border: 1px solid #E7E5E4; border-radius: 12px; padding: 16px 20px; margin: 0 0 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">\n`
  html += `  <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #16A34A; margin: 0 0 8px;">&#10003; Match found</p>\n`
  html += `  <p style="font-family: Georgia, serif; font-size: 16px; font-weight: 700; color: #1C1917; margin: 0 0 6px;">${escHtml(featured.scriptTitle)}</p>\n`
  html += `  <p style="font-size: 13.5px; color: #57534E; margin: 0;">Matched <strong>${featured.matchCount} ${featured.matchCount === 1 ? 'opportunity' : 'opportunities'}</strong>`
  if (featured.matchingOpps.length > 0) {
    html += ` including <em>${escHtml(featured.matchingOpps[0])}</em>`
  }
  html += `</p>\n`
  html += `</div>\n`

  // If more scripts matched
  const remaining = scriptMatches.length - 1
  if (remaining > 0) {
    html += `<div style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 10px; padding: 12px 18px; margin: 0 0 20px;">\n`
    html += `  <p style="font-size: 13.5px; color: #57534E; margin: 0;"><strong>${remaining} more</strong> of your scripts also matched opportunities.</p>\n`
    html += `</div>\n`
  } else {
    html += `<div style="height: 8px;"></div>\n`
  }

  return html
}

function buildMatchCardsText(scriptMatches) {
  let text = ''
  const featured = scriptMatches[0]
  text += `"${featured.scriptTitle}" matched ${featured.matchCount} ${featured.matchCount === 1 ? 'opportunity' : 'opportunities'}`
  if (featured.matchingOpps.length > 0) {
    text += ` including "${featured.matchingOpps[0]}"`
  }
  text += '\n'

  const remaining = scriptMatches.length - 1
  if (remaining > 0) {
    text += `${remaining} more of your scripts also matched opportunities.\n`
  }
  return text
}

function buildSubjectSummary(scriptMatches) {
  const totalScripts = scriptMatches.length
  const featured = scriptMatches[0]
  if (totalScripts === 1) {
    return `"${featured.scriptTitle}" matched ${featured.matchCount} ${featured.matchCount === 1 ? 'opportunity' : 'opportunities'}`
  }
  const totalOpps = new Set(scriptMatches.flatMap((m) => m.matchingOpps)).size
  return `${totalScripts} of your scripts matched opportunities`
}

function render(template, vars) {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v)
  }
  return out
}

// ── Preview ───────────────────────────────────────────────────────
console.log('\nFirst 5 recipients:')
for (const u of cohort.slice(0, 5)) {
  const matches = matchesByUser.get(u.id) || []
  const fn = firstName(u.full_name, u.email)
  const scripts = matches.map((m) => `${m.scriptTitle}(${m.matchCount})`).join(', ')
  console.log(`  → ${u.email}  (${fn}, ${matches.length} scripts matched, code=${u.referral_code || 'none'})`)
  console.log(`    ${scripts}`)
}
if (cohort.length > 5) console.log(`  ... and ${cohort.length - 5} more`)
console.log()

const TAG = 'trial-opportunities-personal'

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

function buildEmail(user) {
  const matches = matchesByUser.get(user.id) || []
  const fn = firstName(user.full_name, user.email)
  const refCode = user.referral_code || '—'

  const vars = {
    first_name: fn,
    match_summary_subject: buildSubjectSummary(matches),
    match_cards_html: buildMatchCardsHtml(matches),
    match_cards_text: buildMatchCardsText(matches),
    referral_code: refCode,
  }

  return {
    subject: render(SUBJECT_TPL, vars),
    html: render(HTML_TPL, vars),
    text: render(TEXT_TPL, vars),
  }
}

// ── TEST MODE ─────────────────────────────────────────────────────
if (TEST) {
  const sample = cohort[0]
  const { subject, html, text } = buildEmail(sample)
  const r = await postOne({
    to: 'anuj@gem.studio',
    subject: `[TEST] ${subject}`,
    html,
    text,
    tag: `${TAG}-test`,
  })
  if (r.ok) {
    console.log(`[TEST] ✓ Sent to anuj@gem.studio using data from ${sample.email} (MessageID: ${r.json.MessageID})`)
  } else {
    console.error(`[TEST] ✗ Failed (${r.status}):`, r.json)
    process.exit(1)
  }
  process.exit(0)
}

if (DRY) {
  const sample = cohort[0]
  const { subject, html, text } = buildEmail(sample)
  console.log('--- PREVIEW (first recipient) ---')
  console.log(`To: ${sample.email}`)
  console.log(`Subject: ${subject}`)
  const matches = matchesByUser.get(sample.id) || []
  for (const m of matches) {
    console.log(`  "${m.scriptTitle}" → ${m.matchCount} opps: ${m.matchingOpps.join(', ')}`)
  }
  console.log(`Referral: ${sample.referral_code || 'none'}`)
  console.log()
  console.log('DRY RUN — no emails sent.')
  console.log('  --test  → send ONE test email to anuj@gem.studio')
  console.log('  --send  → fire to full cohort')
  process.exit(0)
}

// ── SEND MODE ─────────────────────────────────────────────────────
const SEND_LOG = path.join(
  process.cwd(), 'scripts', 'broadcast-trial-opportunities-log.json'
)
let log = {}
try {
  if (fs.existsSync(SEND_LOG)) log = JSON.parse(fs.readFileSync(SEND_LOG, 'utf8'))
} catch {}

let sent = 0
let failed = 0
let skipped = 0
for (const u of cohort) {
  const emailKey = u.email.toLowerCase()
  if (log[emailKey]) {
    skipped++
    continue
  }
  const { subject, html, text } = buildEmail(u)
  try {
    const result = await postOne({ to: u.email, subject, html, text, tag: TAG })
    if (result.ok) {
      sent++
      const matches = matchesByUser.get(u.id) || []
      log[emailKey] = {
        first_name: firstName(u.full_name, u.email),
        scripts_matched: matches.length,
        referral_code: u.referral_code,
        message_id: result.json.MessageID,
        sent_at: new Date().toISOString(),
      }
      fs.writeFileSync(SEND_LOG, JSON.stringify(log, null, 2))
      if (sent % 10 === 0) console.log(`  [${sent}] last=${u.email}`)
    } else {
      failed++
      console.error(`  ✗ Failed ${u.email} (${result.status}):`, result.json)
    }
  } catch (err) {
    failed++
    console.error(`  ✗ Error ${u.email}:`, err.message)
  }
  await new Promise((res) => setTimeout(res, 60))
}

console.log(`\nDone. sent=${sent} failed=${failed} skipped=${skipped}`)
console.log(`Log: ${path.relative(process.cwd(), SEND_LOG)}`)
