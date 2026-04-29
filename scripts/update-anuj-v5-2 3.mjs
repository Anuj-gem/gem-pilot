// Updates Anuj's 11 scorable evaluations in script_evaluations with v5.2 JSON.
// Reads payloads from src/data/v5-1-previews/{eval_id}.json, recomputes
// weighted_score and tier, and writes { evaluation, weighted_score, tier } back.
//
// Safety: snapshots existing rows to src/data/v5-1-previews/_backup/anuj-pre-v52.json
// first so we can roll back if anything goes wrong.
//
// Run with:
//   OPENAI_API_KEY_NOT_NEEDED=1 node scripts/update-anuj-v5-2.mjs [--dry]

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

// Minimal .env.local loader (avoids adding dotenv as a dep for a one-off script).
try {
  const envRaw = await fs.readFile(path.join(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envRaw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const DRY = process.argv.includes('--dry')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// V3_RAW_WEIGHTS — must match src/types/index.ts exactly. Sum = 15.0.
const WEIGHTS = {
  audience_appeal_marketability: 4.0,
  conceptual_hook_clarity: 2.0,
  character_appeal_and_long_term_potential: 2.0,
  creative_originality_and_boldness: 1.5,
  narrative_momentum_engagement: 1.5,
  resonant_originality: 1.0,
  world_density_and_texture: 1.0,
  tonal_specificity: 0.8,
  latent_depth_slow_burn_potential: 0.7,
  relationship_density_and_ensemble_engine: 0.5,
}
const TOTAL_W = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)

function calcWeighted(scores) {
  let acc = 0
  for (const [k, w] of Object.entries(WEIGHTS)) {
    const s = scores?.[k]?.score
    if (typeof s !== 'number') return null
    acc += s * w
  }
  // Scale 0-10 dim scores to 0-100 composite, one decimal precision.
  return Math.round((acc / TOTAL_W) * 10 * 100) / 100
}

function calcTier(composite) {
  if (composite >= 85) return 'Greenlight Material'
  if (composite >= 60) return 'Optionable'
  return 'Needs Development'
}

// The 11 scorable evaluations on anuj@gem.studio (4 West Wing scanned PDFs excluded).
const EVAL_IDS = [
  '62bbd4ad-90fa-4bcd-8da6-b682746adec5', // I Work in Marketing (1) — public
  '6c0a2f3e-6119-417a-b2e3-92cd8c88e853', // In the Maze of Existence (14)
  '4c3605fc-a347-44d9-8776-1ab640df7771', // game of thrones 101
  '810372b5-7126-4d61-9529-c12ed617b569', // the sopranos
  '8b33be99-3d3e-4e96-9429-aa29ece26a65', // The Big Bang Theory
  '54fbabff-16d5-4542-916b-4c99b26e9e0c', // The Blacklist
  'fb62ffe7-57b1-4a38-a29a-480cc5b06e42', // the sopranos 101 piot 1999
  '9a1b836b-ec14-4528-9980-2e3c353c12f6', // I Work in Marketing (2)
  '4abd3ffd-5dc7-4ccf-be84-e1d0fae407ff', // Heartland Express
  '0a70603a-25d5-48eb-9cfc-b79655eb8b70', // Nick of Time
  '7b64fa78-2268-4fcd-ac2e-268f25e2a1c5', // I Work in Marketing (3)
]

const previewsDir = path.join(process.cwd(), 'src', 'data', 'v5-1-previews')
const backupDir = path.join(previewsDir, '_backup')
await fs.mkdir(backupDir, { recursive: true })

// 1) Snapshot current state (pre-update) to disk for rollback safety.
console.log(`Snapshotting current state for ${EVAL_IDS.length} evals...`)
const { data: before, error: beforeErr } = await supabase
  .from('script_evaluations')
  .select('id, submission_id, weighted_score, tier, evaluation, created_at')
  .in('id', EVAL_IDS)
if (beforeErr) {
  console.error('Snapshot read failed:', beforeErr)
  process.exit(1)
}
const backupPath = path.join(
  backupDir,
  `anuj-pre-v52-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
)
await fs.writeFile(backupPath, JSON.stringify(before, null, 2))
console.log(`Snapshot written to ${path.relative(process.cwd(), backupPath)}`)

// 2) For each eval, load the v5.2 payload, compute composite + tier, UPDATE.
let updated = 0
let skipped = 0
for (const evalId of EVAL_IDS) {
  const payloadPath = path.join(previewsDir, `${evalId}.json`)
  let payload
  try {
    payload = JSON.parse(await fs.readFile(payloadPath, 'utf-8'))
  } catch (e) {
    console.error(`  [${evalId.slice(0, 8)}] no preview file — skipping`)
    skipped++
    continue
  }
  const e = payload?.evaluation
  const scores = e?.scores ?? {}
  if (Object.keys(scores).length < 10) {
    console.error(`  [${evalId.slice(0, 8)}] incomplete scores (${Object.keys(scores).length}/10) — skipping`)
    skipped++
    continue
  }
  const composite = calcWeighted(scores)
  if (composite === null) {
    console.error(`  [${evalId.slice(0, 8)}] could not compute composite — skipping`)
    skipped++
    continue
  }
  const tier = calcTier(composite)
  const title = payload.title ?? '?'
  const flag = composite >= 80 ? '★ GEM Select' : ''
  console.log(
    `  [${evalId.slice(0, 8)}] ${title.slice(0, 40).padEnd(40)} → ${composite.toFixed(2)}  ${tier}  ${flag}`
  )
  if (DRY) continue
  const { error: updErr } = await supabase
    .from('script_evaluations')
    .update({ evaluation: e, weighted_score: composite, tier })
    .eq('id', evalId)
  if (updErr) {
    console.error(`    UPDATE failed:`, updErr)
    skipped++
    continue
  }
  updated++
}

console.log(
  `\nDone. updated=${updated} skipped=${skipped} (dry=${DRY})  backup=${path.relative(process.cwd(), backupPath)}`
)
