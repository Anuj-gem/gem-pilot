/**
 * Re-score all existing completed submissions using the v5.2 prompt,
 * EXCLUDING any submission owned by an @gem.studio account.
 *
 * This writes directly to `script_evaluations` (LIVE). That is intentional:
 * scores are not surfaced on main right now, so any score shifts will feel
 * like a fresh score when the v5-1-preview branch ships. We snapshot the
 * pre-run state to disk first so we can roll back if we have to.
 *
 * CRITICAL: no emails fire from this script. The email is sent from the
 * /api/evaluate route handler (line ~321 in src/app/api/evaluate/route.ts).
 * Writing to the DB via the service client bypasses that code path entirely.
 *
 * Flow per submission:
 *   - Download the PDF from the `scripts` storage bucket
 *   - Extract text with pdf-parse
 *   - Build the v5.2 prompt (imported from src/lib/evaluation-prompt-v5-1.ts)
 *   - Call gpt-5.4-mini with JSON mode
 *   - Compute weighted_score + tier using V3_RAW_WEIGHTS (sum = 15.0)
 *   - Cache result to data/v5-2-rescore-cache/<submission_id>.json (resumable)
 *   - UPDATE script_evaluations by eval_id
 *
 * Usage:
 *   node scripts/rescore-all-v5-2.mjs --dry                    # scope + cost only
 *   node scripts/rescore-all-v5-2.mjs --dry --limit=5          # dry-run on first 5
 *   node scripts/rescore-all-v5-2.mjs --limit=5                # real run on first 5
 *   node scripts/rescore-all-v5-2.mjs                          # full serial run
 *   node scripts/rescore-all-v5-2.mjs --concurrency=5          # full parallel run (recommended)
 *   node scripts/rescore-all-v5-2.mjs --start-from=200         # resume from index
 *   node scripts/rescore-all-v5-2.mjs --no-cache               # force re-eval
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

// ── Extract v5.2 prompt template from evaluation-prompt-v5-1.ts ────
// The source is TS, so we can't import it. We extract the template
// literal body and do ${formatLine} / ${declaredFormat} substitution.
const promptPath = path.join(process.cwd(), 'src', 'lib', 'evaluation-prompt-v5-1.ts')
const promptSrc = await fs.readFile(promptPath, 'utf-8')

const START_MARK = 'return `'
const END_MARK = '`;\n}'
const startIdx = promptSrc.indexOf(START_MARK)
if (startIdx < 0) {
  console.error('Could not find prompt template start in evaluation-prompt-v5-1.ts')
  process.exit(1)
}
const contentStart = startIdx + START_MARK.length
// Use lastIndexOf: there's one function returning a template literal,
// so the final `;\n} is the function close.
const contentEnd = promptSrc.lastIndexOf(END_MARK)
if (contentEnd <= contentStart) {
  console.error('Could not find prompt template end in evaluation-prompt-v5-1.ts')
  process.exit(1)
}
// Unescape template-literal escapes: backticks and dollar signs.
// Order matters: handle backslash-escaped backticks and dollars BEFORE
// collapsing any raw backslashes. The file in practice uses \` and \$ only.
let PROMPT_TEMPLATE = promptSrc.slice(contentStart, contentEnd)
  .replace(/\\`/g, '`')
  .replace(/\\\$/g, '$')

function buildV52Prompt(declaredFormat) {
  const formatLine =
    declaredFormat === 'Series'
      ? `The writer has declared this script as a **Series** (TV pilot). Treat format as fixed — evaluate it as a pilot for an ongoing series, not as a feature film. Genre and tone are still for you to classify.`
      : `The writer has declared this script as a **Feature film**. Treat format as fixed — evaluate it as a feature film, not as a TV pilot or series. Genre and tone are still for you to classify.`
  return PROMPT_TEMPLATE
    .replaceAll('${formatLine}', formatLine)
    .replaceAll('${declaredFormat}', declaredFormat)
}

// Sanity-check the extracted prompt
const sanity = buildV52Prompt('Feature film')
if (sanity.length < 5000 || sanity.includes('${')) {
  console.error(
    `Prompt extraction failed sanity check (len=${sanity.length}, contains \${: ${sanity.includes('${')})`
  )
  process.exit(1)
}

// ── Cache ──────────────────────────────────────────────────────────
const CACHE_DIR = path.join(process.cwd(), 'data', 'v5-2-rescore-cache')
const BACKUP_DIR = path.join(process.cwd(), 'data', 'v5-2-rescore-backup')
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

// ── OpenAI call ────────────────────────────────────────────────────
async function evaluateScript(scriptText, declaredFormat) {
  const systemPrompt = buildV52Prompt(declaredFormat)
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

// ── Main ───────────────────────────────────────────────────────────
console.log(`\n=== GEM v5.2 Re-Score → LIVE ${DRY ? '(DRY RUN)' : ''} ===`)
console.log(`Target table: script_evaluations`)
console.log(`Cache: ${USE_CACHE ? 'ON (--no-cache to force re-eval)' : 'OFF'}`)
console.log(`Concurrency: ${CONCURRENCY}`)
if (LIMIT) console.log(`Limit: ${LIMIT}`)
if (START_FROM) console.log(`Start-from index: ${START_FROM}`)
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

// 2. Fetch every completed submission with a file + eval
const { data: submissions, error: subErr } = await sb
  .from('script_submissions')
  .select('id, title, file_url, declared_format, user_id, script_evaluations(id, evaluation)')
  .eq('status', 'completed')
  .not('file_url', 'is', null)
  .order('created_at', { ascending: true })
if (subErr) {
  console.error('Failed to fetch submissions:', subErr)
  process.exit(1)
}

// Normalize script_evaluations (1:1 but comes back as array)
const enriched = submissions
  .map((s) => {
    const se = Array.isArray(s.script_evaluations)
      ? s.script_evaluations[0]
      : s.script_evaluations
    return { ...s, eval_id: se?.id ?? null, prev_evaluation: se?.evaluation ?? null }
  })
  .filter((s) => s.eval_id && !internalIds.has(s.user_id))

console.log(
  `Found ${enriched.length} external submissions with evaluations ` +
    `(skipped ${submissions.length - enriched.length} internal/no-eval)`
)

// 3. Apply --start-from / --limit
const slice = enriched
  .slice(START_FROM)
  .slice(0, LIMIT == null ? enriched.length : LIMIT)

console.log(`Will process ${slice.length} submissions\n`)

// 4. Snapshot current live evaluations for everything we're about to touch
const affectedEvalIds = slice.map((s) => s.eval_id)
if (affectedEvalIds.length > 0 && !DRY) {
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
  const backupPath = path.join(BACKUP_DIR, `pre-v5-2-${stamp}.json`)
  await fs.writeFile(backupPath, JSON.stringify(before, null, 2))
  console.log(`Snapshot written to ${path.relative(process.cwd(), backupPath)}\n`)
}

// 5. Process — optionally in parallel. Each task buffers its own log lines
// and flushes them as one block on completion, so output stays readable when
// workers overlap.
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

    const { error: updErr } = await sb
      .from('script_evaluations')
      .update({
        evaluation: result.evaluation,
        weighted_score: result.weightedScore,
        tier: result.tier,
        model: 'gpt-5.4-mini-v5-2-rescore',
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

// Simple worker pool — fan out up to CONCURRENCY tasks at a time.
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
  console.log(`\nBackups: ${path.relative(process.cwd(), BACKUP_DIR)}/pre-v5-2-*.json`)
  console.log(`Cache:   ${path.relative(process.cwd(), CACHE_DIR)}/<submission_id>.json`)
}
