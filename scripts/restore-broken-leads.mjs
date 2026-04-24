// One-off restore script (2026-04-23). The Apr 23 v5.3 live rescore wrote
// empty / only-Supporting lead_characters to ~32 production rows because the
// skip-guard had been removed for the preview workflow. This script:
//
//   1. Reads every receipt under data/rescore-runs/* with status starting
//      with "wrote:leads_empty" or "wrote:leads_only_supporting".
//   2. Looks each one up in the matching pre-rescore snapshot.
//   3. Writes the snapshot's prior evaluation back to script_evaluations.
//
// Idempotent — safe to re-run. Only touches rows that currently have empty/
// only-Supporting leads (no-op if they've since been fixed).
//
// Usage:
//   node scripts/restore-broken-leads.mjs --dry      # preview
//   node scripts/restore-broken-leads.mjs            # actually restore
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local (same pattern as rescore-all.mjs)
try {
  const envRaw = await fsp.readFile(path.join(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envRaw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run')

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SB_URL || !SB_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(SB_URL, SB_KEY)

// 1. Walk every receipts dir, collect bad-leads writes
const RUNS = path.join(process.cwd(), 'data', 'rescore-runs')
const broken = []
for (const dir of fs.readdirSync(RUNS)) {
  const dirPath = path.join(RUNS, dir)
  if (!fs.statSync(dirPath).isDirectory()) continue
  for (const f of fs.readdirSync(dirPath)) {
    const r = JSON.parse(fs.readFileSync(path.join(dirPath, f), 'utf8'))
    const s = r.status || ''
    if (s === 'wrote:leads_empty' || s === 'wrote:leads_only_supporting') {
      broken.push({
        submission_id: r.submission_id,
        eval_id: r.eval_id,
        title: r.title,
        kind: s.replace('wrote:leads_', ''),
        receipt_ts: r.timestamp,
      })
    }
  }
}
console.log(`Found ${broken.length} bad-leads write(s) across all run receipts`)

// 2. Build a snapshot lookup: { submission_id → prior evaluation row }
const SNAP_DIR = path.join(process.cwd(), 'data', 'rescore-backup')
const snapBySub = new Map()
for (const f of fs.readdirSync(SNAP_DIR)) {
  if (!f.endsWith('.json')) continue
  const rows = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, f), 'utf8'))
  for (const r of rows ?? []) {
    if (!r.submission_id) continue
    // Keep the OLDEST snapshot per submission — that's the one before our
    // first overwrite, i.e. the truly-original-prior eval.
    if (!snapBySub.has(r.submission_id)) snapBySub.set(r.submission_id, r)
  }
}
console.log(`Indexed ${snapBySub.size} prior eval rows from ${fs.readdirSync(SNAP_DIR).length} snapshot file(s)`)

// 3. For each broken eval, verify it's STILL broken on live, then restore
let restored = 0
let alreadyOk = 0
let noSnapshot = 0
let errors = 0
for (const b of broken) {
  // Check live state — only restore if leads are still empty/only-supporting
  const { data: live, error: liveErr } = await sb
    .from('script_evaluations')
    .select('id, evaluation, model')
    .eq('id', b.eval_id)
    .maybeSingle()
  if (liveErr || !live) {
    console.error(`  ✗ ${b.title}: live read failed`)
    errors++
    continue
  }
  const liveLeads = live.evaluation?.lead_characters ?? []
  const allSupporting =
    Array.isArray(liveLeads) &&
    liveLeads.length > 0 &&
    liveLeads.every((c) => String(c?.role_type ?? '').toLowerCase() === 'supporting')
  const stillBroken = !Array.isArray(liveLeads) || liveLeads.length === 0 || allSupporting
  if (!stillBroken) {
    alreadyOk++
    continue
  }

  const prior = snapBySub.get(b.submission_id)
  if (!prior) {
    console.error(`  ✗ ${b.title}: no snapshot found`)
    noSnapshot++
    continue
  }

  if (DRY) {
    console.log(`  [DRY] would restore ${b.title} (${b.eval_id.slice(0, 8)}) — prior model=${prior.model}, prior leads=${prior.evaluation?.lead_characters?.length ?? 0}`)
    restored++
    continue
  }

  const { error: updErr } = await sb
    .from('script_evaluations')
    .update({
      evaluation: prior.evaluation,
      weighted_score: prior.weighted_score,
      tier: prior.tier,
      model: prior.model, // restore the prior model tag too
    })
    .eq('id', b.eval_id)
  if (updErr) {
    console.error(`  ✗ ${b.title}: restore write failed:`, updErr.message)
    errors++
    continue
  }
  console.log(`  ✓ Restored ${b.title} (${b.eval_id.slice(0, 8)})`)
  restored++
}

console.log(`\n=== Done ===`)
console.log(`Restored: ${restored} | Already-OK: ${alreadyOk} | No-snapshot: ${noSnapshot} | Errors: ${errors}`)
if (DRY) console.log(`\nThis was a dry run — no DB writes.`)
