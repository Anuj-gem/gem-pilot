/**
 * Re-score existing completed submissions using the current prompt
 * (src/lib/evaluation-prompt.ts), EXCLUDING any submission owned by an
 * @gem.studio account.
 *
 * This writes directly to `script_evaluations` (LIVE). We snapshot the
 * pre-run state to disk first so we can roll back if we have to.
 *
 * CRITICAL: no emails fire from this script. The email is sent from the
 * /api/evaluate route handler. Writing to the DB via the service client
 * bypasses that code path entirely.
 *
 * Flow per submission:
 *   - Download the PDF from the `scripts` storage bucket
 *   - Extract text with pdf-parse
 *   - Build the current prompt (extracted from src/lib/evaluation-prompt.ts)
 *   - Call gpt-5.4-mini with JSON mode
 *   - Compute weighted_score + tier using V3_RAW_WEIGHTS (sum = 15.0)
 *   - Cache result to data/rescore-cache/<submission_id>.json (resumable)
 *   - UPDATE script_evaluations by eval_id
 *
 * Usage:
 *   node scripts/rescore-all.mjs --dry                         # scope + cost only
 *   node scripts/rescore-all.mjs --dry --limit=5               # dry-run on first 5
 *   node scripts/rescore-all.mjs --limit=5                     # real run on first 5
 *   node scripts/rescore-all.mjs                               # full serial run
 *   node scripts/rescore-all.mjs --concurrency=5               # full parallel run
 *   node scripts/rescore-all.mjs --start-from=200              # resume from index
 *   node scripts/rescore-all.mjs --no-cache                    # force re-eval
 *   node scripts/rescore-all.mjs --user-id=<uuid>              # only this user
 *   node scripts/rescore-all.mjs --since=<iso-date>            # evals >= date
 *   node scripts/rescore-all.mjs --model-ne=gpt-5.4-mini-v5-2-rescore   # exclude model
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 *   (auto-loaded from .env.local if present)
 */

import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

// ── Minimal .env.local loader ──────────────────────────────────────
try {
  const envRaw = await fs.readFile(path.join(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envRaw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

// ── Flags ──────────────────────────────────────────────────────────
const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run')
// --preview: write results to script_evaluations_pending instead of the live
// script_evaluations table. The /admin/preview-v5-1/[id] page (and the report
// page with USE_PENDING_EVALS=1) reads from pending. Lets us stage a prompt
// change on a handful of evals without touching any writer's live report.
const PREVIEW = process.argv.includes('--preview')
const USE_CACHE = !process.argv.includes('--no-cache')
const START_FROM = parseInt(
  (process.argv.find((a) => a.startsWith('--start-from=')) || '=0').split('=')[1]
) || 0
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : null
const CONCURRENCY_ARG = process.argv.find((a) => a.startsWith('--concurrency=') || a.startsWith('-c='))
const CONCURRENCY = Math.max(
  1,
  CONCURRENCY_ARG ? parseInt(CONCURRENCY_ARG.split('=')[1]) : 1
)
const USER_ID_ARG = process.argv.find((a) => a.startsWith('--user-id='))
const USER_ID = USER_ID_ARG ? USER_ID_ARG.split('=')[1] : null
const SINCE_ARG = process.argv.find((a) => a.startsWith('--since='))
const SINCE = SINCE_ARG ? SINCE_ARG.split('=')[1] : null
const MODEL_NE_ARG = process.argv.find((a) => a.startsWith('--model-ne='))
const MODEL_NE = MODEL_NE_ARG ? MODEL_NE_ARG.split('=')[1] : null
// --needs-v52: select any eval that is NOT already healthy on v5.2.
// "Healthy" = has director_appeal.fit_profile AND non-empty lead_characters.
const NEEDS_V52 = process.argv.includes('--needs-v52')
// --eval-ids=<comma-separated>: only rescore submissions whose current eval_id is in this list
const EVAL_IDS_ARG = process.argv.find((a) => a.startsWith('--eval-ids='))
const EVAL_IDS = EVAL_IDS_ARG
  ? new Set(EVAL_IDS_ARG.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean))
  : null

// ── Env ────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!DRY && !OPENAI_KEY) {
  console.error('Missing OPENAI_API_KEY (required for real runs; --dry is fine without)')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── V3_RAW_WEIGHTS — mirrors src/types/index.ts (sum = 15.0) ───────
const WEIGHTS = {
  audience_appeal_marketability: 2.5,
  conceptual_hook_clarity: 1.5,
  character_appeal_and_long_term_potential: 1.0,
  creative_originality_and_boldness: 0.5,
  narrative_momentum_engagement: 0.5,
  resonant_originality: 0.5,
  world_density_and_texture: 3.0,
  tonal_specificity: 2.5,
  latent_depth_slow_burn_potential: 0.5,
  relationship_density_and_ensemble_engine: 2.5,
}
const TOTAL_W = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
const DIM_IDS = Object.keys(WEIGHTS)

function calcWeighted(scores) {
  let acc = 0
  for (const dim of DIM_IDS) {
    const s = scores?.[dim]?.score
    if (typeof s !== 'number') return null
    acc += s * WEIGHTS[dim]
  }
  return Math.round((acc / TOTAL_W) * 10 * 10) / 10 // one decimal, 0-100
}

function calcTier(composite) {
  if (composite >= 85) return 'Greenlight Material'
  if (composite >= 60) return 'Optionable'
  return 'Needs Development'
}

// ── Extract prompt template from evaluation-prompt.ts ──────────────
// The source is TS, so we can't import it directly. We extract the
// template literal body and do ${formatLine} / ${declaredFormat} sub.
const promptPath = path.join(process.cwd(), 'src', 'lib', 'evaluation-prompt.ts')
const promptSrc = await fs.readFile(promptPath, 'utf-8')

const START_MARK = 'return `'
const END_MARK = '`;\n}'
const startIdx = promptSrc.indexOf(START_MARK)
if (startIdx < 0) {
  console.error('Could not find prompt template start in evaluation-prompt.ts')
  process.exit(1)
}
const contentStart = startIdx + START_MARK.length
const contentEnd = promptSrc.lastIndexOf(END_MARK)
if (contentEnd <= contentStart) {
  console.error('Could not find prompt template end in evaluation-prompt.ts')
  process.exit(1)
}
// Unescape template-literal escapes: backticks and dollar signs.
let PROMPT_TEMPLATE = promptSrc.slice(contentStart, contentEnd)
  .replace(/\\`/g, '`')
  .replace(/\\\$/g, '$')

function buildPrompt(declaredFormat) {
  const formatLine =
    declaredFormat === 'Series'
      ? `The writer has declared this script as a **Series** (TV pilot). Treat format as fixed — evaluate it as a pilot for an ongoing series, not as a feature film. Genre and tone are still for you to classify.`
      : `The writer has declared this script as a **Feature film**. Treat format as fixed — evaluate it as a feature film, not as a TV pilot or series. Genre and tone are still for you to classify.`
  return PROMPT_TEMPLATE
    .replaceAll('${formatLine}', formatLine)
    .replaceAll('${declaredFormat}', declaredFormat)
}

// Sanity-check the extracted prompt
const sanity = buildPrompt('Feature film')
if (sanity.length < 5000 || sanity.includes('${')) {
  console.error(
    `Prompt extraction failed sanity check (len=${sanity.length}, contains \${: ${sanity.includes('${')})`
  )
  process.exit(1)
}

// ── Cache ──────────────────────────────────────────────────────────
const CACHE_DIR = path.join(process.cwd(), 'data', 'rescore-cache')
const BACKUP_DIR = path.join(process.cwd(), 'data', 'rescore-backup')
fsSync.mkdirSync(CACHE_DIR, { recursive: true })
fsSync.mkdirSync(BACKUP_DIR, { recursive: true })

function cachePath(submissionId) {
  return path.join(CACHE_DIR, `${submissionId}.json`)
}
function loadCached(submissionId) {
  if (!USE_CACHE) return null
  const p = cachePath(submissionId)
  if (fsSync.existsSync(p)) return JSON.parse(fsSync.readFileSync(p, 'utf8'))
  return null
}
function saveCache(submissionId, data) {
  fsSync.writeFileSync(cachePath(submissionId), JSON.stringify(data, null, 2))
}

// ── Lead-character health helpers ──────────────────────────────────
// The Apr 23 re-score uncovered a subtler failure than "empty leads":
// the model sometimes returns lead_characters populated entirely with
// role_type "Supporting" (no Lead/Protagonist). Writers see a report
// with no main character and complain. Treat "all-supporting" as
// unhealthy too, and retry once with a protagonist-forcing nudge.
function leadsEmpty(leads) {
  return !Array.isArray(leads) || leads.length === 0
}
function leadsOnlySupporting(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return false
  return leads.every((c) => {
    const role = String(c?.role_type ?? '').toLowerCase().trim()
    return role === 'supporting' || role === ''
  })
}
function leadsUnhealthy(leads) {
  return leadsEmpty(leads) || leadsOnlySupporting(leads)
}

// ── OpenAI call ────────────────────────────────────────────────────
async function callOpenAI(systemPrompt, scriptText, declaredFormat) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `The writer has declared this script as a ${declaredFormat}. Please evaluate the following screenplay submission accordingly:\n\n---\n\n${scriptText}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${err}`)
  }
  const data = await response.json()
  const evaluation = JSON.parse(data.choices[0].message.content)
  const inputTokens = data.usage?.prompt_tokens ?? 0
  const outputTokens = data.usage?.completion_tokens ?? 0
  const cost = (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5
  return { evaluation, inputTokens, outputTokens, cost }
}

async function evaluateScript(scriptText, declaredFormat) {
  // Single call — exact same prompt production uses. No runtime overrides.
  // Any reliability fixes live in src/lib/evaluation-prompt.ts so prod and
  // rescore stay in lockstep.
  return callOpenAI(buildPrompt(declaredFormat), scriptText, declaredFormat)
}

// ── Main ───────────────────────────────────────────────────────────
const TARGET_TABLE = PREVIEW ? 'script_evaluations_pending' : 'script_evaluations'
console.log(`\n=== GEM Re-Score → ${PREVIEW ? 'PREVIEW (pending table, no live writes)' : 'LIVE'} ${DRY ? '(DRY RUN)' : ''} ===`)
console.log(`Target table: ${TARGET_TABLE}`)
console.log(`Cache: ${USE_CACHE ? 'ON (--no-cache to force re-eval)' : 'OFF'}`)
console.log(`Concurrency: ${CONCURRENCY}`)
if (LIMIT) console.log(`Limit: ${LIMIT}`)
if (START_FROM) console.log(`Start-from index: ${START_FROM}`)
if (USER_ID) console.log(`User filter: ${USER_ID}`)
if (SINCE) console.log(`Since: ${SINCE}`)
if (MODEL_NE) console.log(`Exclude model: ${MODEL_NE}`)
console.log('')

// 1. Enumerate @gem.studio users so we can exclude them
const { data: usersPage, error: usersErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
if (usersErr) {
  console.error('Failed to list auth users:', usersErr)
  process.exit(1)
}
const internalIds = new Set(
  (usersPage?.users ?? [])
    .filter((u) => (u.email ?? '').toLowerCase().endsWith('@gem.studio'))
    .map((u) => u.id)
)
console.log(`Excluding ${internalIds.size} internal @gem.studio users`)

// 2. Fetch every completed submission with a file + eval (optionally filtered)
let query = sb
  .from('script_submissions')
  .select('id, title, file_url, declared_format, user_id, created_at, script_evaluations(id, evaluation, model, created_at)')
  .eq('status', 'completed')
  .not('file_url', 'is', null)
  .order('created_at', { ascending: true })

if (USER_ID) query = query.eq('user_id', USER_ID)

const { data: submissions, error: subErr } = await query
if (subErr) {
  console.error('Failed to fetch submissions:', subErr)
  process.exit(1)
}

// Normalize script_evaluations (1:1 but comes back as array)
let enriched = submissions
  .map((s) => {
    const se = Array.isArray(s.script_evaluations)
      ? s.script_evaluations[0]
      : s.script_evaluations
    return {
      ...s,
      eval_id: se?.id ?? null,
      prev_evaluation: se?.evaluation ?? null,
      eval_model: se?.model ?? null,
      eval_created_at: se?.created_at ?? null,
    }
  })
  .filter((s) => s.eval_id && !internalIds.has(s.user_id))

if (SINCE) {
  enriched = enriched.filter((s) => (s.eval_created_at ?? '') >= SINCE)
}
if (MODEL_NE) {
  enriched = enriched.filter((s) => (s.eval_model ?? '') !== MODEL_NE)
}
if (NEEDS_V52) {
  enriched = enriched.filter((s) => {
    const ev = s.prev_evaluation ?? {}
    const leads = Array.isArray(ev.lead_characters) ? ev.lead_characters : []
    const fit = ev?.package_angles?.director_appeal?.fit_profile
    const leadsOK =
      leads.length > 0 &&
      !leads.every((c) => {
        const role = String(c?.role_type ?? '').toLowerCase().trim()
        return role === 'supporting' || role === ''
      })
    const healthy =
      leadsOK && typeof fit === 'string' && fit.trim().length > 0
    return !healthy
  })
}
if (EVAL_IDS) {
  enriched = enriched.filter((s) => EVAL_IDS.has(s.eval_id))
}

console.log(
  `Found ${enriched.length} submissions to consider ` +
    `(after internal + optional filters)`
)

// 3. Apply --start-from / --limit
const slice = enriched
  .slice(START_FROM)
  .slice(0, LIMIT == null ? enriched.length : LIMIT)

console.log(`Will process ${slice.length} submissions\n`)

// 4. Snapshot current live evaluations for everything we're about to touch
// (preview runs don't modify live data, so skip the snapshot).
const affectedEvalIds = slice.map((s) => s.eval_id)
if (affectedEvalIds.length > 0 && !DRY && !PREVIEW) {
  console.log(`Snapshotting ${affectedEvalIds.length} current evaluation rows...`)
  const { data: before, error: snapErr } = await sb
    .from('script_evaluations')
    .select('id, submission_id, weighted_score, tier, evaluation, model, created_at')
    .in('id', affectedEvalIds)
  if (snapErr) {
    console.error('Snapshot read failed:', snapErr)
    process.exit(1)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(BACKUP_DIR, `pre-rescore-${stamp}.json`)
  await fs.writeFile(backupPath, JSON.stringify(before, null, 2))
  console.log(`Snapshot written to ${path.relative(process.cwd(), backupPath)}\n`)
}

// 5. Process — optionally in parallel.
let totalCost = 0
let success = 0
let failed = 0
let cached = 0
let dryCounted = 0

async function processOne(sub, absoluteIdx) {
  const logs = []
  const log = (s) => logs.push(s)
  const title = (sub.title ?? '').trim()

  // Resolve declared format — prefer user-declared, else derive from prior eval
  let declaredFormat
  if (sub.declared_format === 'Series' || sub.declared_format === 'Feature film') {
    declaredFormat = sub.declared_format
  } else {
    const prevFmt = (sub.prev_evaluation?.classification?.format ?? '').toLowerCase()
    declaredFormat = prevFmt.includes('pilot') || prevFmt.includes('series')
      ? 'Series'
      : 'Feature film'
  }

  log(
    `[${absoluteIdx}/${enriched.length}] "${title.slice(0, 50)}" (${sub.id.slice(0, 8)}) · ${declaredFormat}`
  )

  try {
    let result = loadCached(sub.id)

    if (result) {
      log(`  ♻ Cached (score: ${result.weightedScore}, tier: ${result.tier})`)
      cached++
    } else {
      const { data: fileData, error: dlErr } = await sb.storage
        .from('scripts')
        .download(sub.file_url)
      if (dlErr || !fileData) {
        log(`  ⚠ Download failed: ${dlErr?.message ?? 'no data'}`)
        failed++
        console.log(logs.join('\n'))
        return
      }
      const buffer = Buffer.from(await fileData.arrayBuffer())
      let scriptText
      try {
        const parsed = await pdfParse(buffer)
        scriptText = parsed.text
      } catch (e) {
        log(`  ⚠ PDF parse failed: ${e.message}`)
        failed++
        console.log(logs.join('\n'))
        return
      }
      if (!scriptText || scriptText.trim().length < 100) {
        log('  ⚠ Not enough text extracted — skipping')
        failed++
        console.log(logs.join('\n'))
        return
      }
      log(`  Extracted ${scriptText.length} chars`)

      if (DRY) {
        log('  [DRY] Would evaluate + update')
        dryCounted++
        console.log(logs.join('\n'))
        return
      }

      const { evaluation, inputTokens, outputTokens, cost } = await evaluateScript(
        scriptText,
        declaredFormat
      )
      const composite = calcWeighted(evaluation.scores)
      if (composite == null) {
        log('  ⚠ Composite calc failed (bad scores payload)')
        failed++
        console.log(logs.join('\n'))
        return
      }
      const tier = calcTier(composite)
      totalCost += cost

      // Guard: don't persist an eval whose lead_characters is empty or
      // entirely "Supporting" (retry-once already tried the protagonist nudge;
      // if we're here the model refused twice — keep the old eval rather
      // than overwrite with a broken one).
      const leads = evaluation?.lead_characters
      if (leadsEmpty(leads)) {
        log('  ⚠ Empty lead_characters after retry — skipping to protect report UI')
        failed++
        console.log(logs.join('\n'))
        return
      }
      if (leadsOnlySupporting(leads)) {
        log('  ⚠ Only-Supporting lead_characters after retry — skipping to protect report UI')
        failed++
        console.log(logs.join('\n'))
        return
      }

      result = {
        evaluation,
        weightedScore: composite,
        tier,
        inputTokens,
        outputTokens,
        cost,
        declaredFormat,
      }
      saveCache(sub.id, result)
      log(`  Score: ${composite} | Tier: ${tier} | Cost: $${cost.toFixed(4)}`)
    }

    if (DRY) {
      console.log(logs.join('\n'))
      return
    }

    if (PREVIEW) {
      // Write to script_evaluations_pending so /admin/preview-v5-1/<eval_id>
      // shows the new output without touching the writer's live report.
      // Clear any existing pending row for this submission first, then insert
      // fresh — avoids needing a unique constraint on submission_id.
      const { error: delErr } = await sb
        .from('script_evaluations_pending')
        .delete()
        .eq('submission_id', sub.id)
      if (delErr) {
        log(`  ✗ Preview clear failed: ${delErr.message}`)
        failed++
        console.log(logs.join('\n'))
        return
      }
      const { error: insErr } = await sb
        .from('script_evaluations_pending')
        .insert({
          submission_id: sub.id,
          evaluation: result.evaluation,
          weighted_score: result.weightedScore,
          tier: result.tier,
          model: 'gpt-5.4-mini-v5-3-preview',
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cost_usd: result.cost,
        })
      if (insErr) {
        log(`  ✗ Preview insert failed: ${insErr.message}`)
        failed++
        console.log(logs.join('\n'))
        return
      }
      log(`  ✓ Preview written → /admin/preview-v5-3/${sub.eval_id}`)
      success++
      console.log(logs.join('\n'))
      return
    }

    const { error: updErr } = await sb
      .from('script_evaluations')
      .update({
        evaluation: result.evaluation,
        weighted_score: result.weightedScore,
        tier: result.tier,
        model: 'gpt-5.4-mini-rescore',
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_usd: result.cost,
      })
      .eq('id', sub.eval_id)

    if (updErr) {
      log(`  ✗ Update failed: ${updErr.message}`)
      failed++
      console.log(logs.join('\n'))
      return
    }
    log(`  ✓ Updated eval ${sub.eval_id.slice(0, 8)}`)
    success++
    console.log(logs.join('\n'))
  } catch (err) {
    log(`  ✗ Error: ${err.message}`)
    failed++
    console.log(logs.join('\n'))
  }
}

// Simple worker pool.
let cursor = 0
async function worker() {
  while (true) {
    const i = cursor++
    if (i >= slice.length) return
    const sub = slice[i]
    const absoluteIdx = START_FROM + i + 1
    await processOne(sub, absoluteIdx)
  }
}

const workers = Array.from({ length: Math.min(CONCURRENCY, slice.length) }, () => worker())
await Promise.all(workers)

console.log(`\n=== Done ===`)
console.log(
  `Success: ${success} | Failed: ${failed} | Cached: ${cached} | ` +
    `DryCounted: ${dryCounted} | Total cost: $${totalCost.toFixed(2)}`
)
if (DRY) {
  console.log(`\nThis was a dry run — no DB writes, no OpenAI calls.`)
} else {
  console.log(`\nBackups: ${path.relative(process.cwd(), BACKUP_DIR)}/pre-rescore-*.json`)
  console.log(`Cache:   ${path.relative(process.cwd(), CACHE_DIR)}/<submission_id>.json`)
}
