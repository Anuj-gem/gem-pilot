#!/usr/bin/env node
/**
 * seed-samples.mjs
 *
 * Seeds the GEM Sample Library by:
 *  1. POSTing each curated PDF to /api/evaluate as an anonymous submission
 *  2. Updating the resulting script_submissions row to mark it as a sample
 *     (is_sample, sample_slug, sample_author, etc.) and clear the anon expiry
 *
 * Expected layout (script lives in gem-app/scripts/):
 *   Selznick_3/
 *     sample_curated_25.json
 *     sample_pdfs/<slug>.pdf
 *     gem-app/
 *       .env.local                     <-- env loaded from here
 *       scripts/seed-samples.mjs       <-- this file
 *
 * Env vars (auto-loaded from gem-app/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env:
 *   GEM_API_BASE   (default: https://gem-pilot.vercel.app)
 *   SAMPLE_LIST    (override curated json path)
 *   SAMPLE_PDFS    (override pdf dir)
 *   ONLY_SLUG      (run only one slug — for retries)
 *   DRY_RUN=1      (print plan, don't call api)
 *
 * Usage (from gem-app/):
 *   node scripts/seed-samples.mjs
 *   DRY_RUN=1 node scripts/seed-samples.mjs
 *   ONLY_SLUG=breaking-bad node scripts/seed-samples.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// gem-app/scripts/ → gem-app/ → Selznick_3/
const GEM_APP_DIR = path.resolve(__dirname, '..')
const REPO_DIR = path.resolve(__dirname, '..', '..')

// ── Env loading ──────────────────────────────────────────────────────────
function loadEnv() {
  const p = path.join(GEM_APP_DIR, '.env.local')
  if (!fs.existsSync(p)) return
  const txt = fs.readFileSync(p, 'utf8')
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2].trim()
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1)
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
}
loadEnv()

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !SUPA_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  console.error('Expected in: ' + path.join(GEM_APP_DIR, '.env.local'))
  process.exit(1)
}

const API_BASE = process.env.GEM_API_BASE || 'https://gem-pilot.vercel.app'
const LIST_PATH =
  process.env.SAMPLE_LIST || path.join(REPO_DIR, 'sample_curated_25.json')
const PDF_DIR = process.env.SAMPLE_PDFS || path.join(REPO_DIR, 'sample_pdfs')
const ONLY = process.env.ONLY_SLUG || null
const DRY = process.env.DRY_RUN === '1'

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
})

// ── Load curated list ────────────────────────────────────────────────────
if (!fs.existsSync(LIST_PATH)) {
  console.error('Curated list not found:', LIST_PATH)
  process.exit(1)
}
if (!fs.existsSync(PDF_DIR)) {
  console.error('PDF dir not found:', PDF_DIR)
  process.exit(1)
}
const list = JSON.parse(fs.readFileSync(LIST_PATH, 'utf8'))

// ── Sample metadata helpers ──────────────────────────────────────────────
function authorFor(item) {
  // Credited creators / writers for each source — shown as byline on /sample/[slug]
  const map = {
    'Breaking Bad': 'Vince Gilligan',
    'Vikings': 'Michael Hirst',
    'Ted Lasso': 'Bill Lawrence, Jason Sudeikis',
    'How I Met Your Mother': 'Carter Bays, Craig Thomas',
    'Prison Break': 'Paul Scheuring',
    'Mindhunter': 'Joe Penhall',
    'The Bear': 'Christopher Storer',
    'Hannibal': 'Bryan Fuller',
    'Sex Education': 'Laurie Nunn',
    'The Expanse': 'Mark Fergus, Hawk Ostby',
    'Euphoria': 'Sam Levinson',
    'The Americans': 'Joe Weisberg',
    'The Leftovers': 'Damon Lindelof, Tom Perrotta',
    'You': 'Greg Berlanti, Sera Gamble',
    'Ray Donovan': 'Ann Biderman',
    'Bates Motel': 'Carlton Cuse, Kerry Ehrin, Anthony Cipriano',
    'The Sopranos': 'David Chase',
    'Game of Thrones': 'David Benioff, D.B. Weiss',
    'Inception': 'Christopher Nolan',
    'Drive': 'Hossein Amini',
    'Looper': 'Rian Johnson',
    'Foxcatcher': 'E. Max Frye, Dan Futterman',
    'Limitless': 'Leslie Dixon',
    'Collateral': 'Stuart Beattie',
    'Hellboy': 'Guillermo del Toro, Peter Briggs',
  }
  return map[item.title] || null
}

// ── Worker ───────────────────────────────────────────────────────────────
async function postEvaluate(item, pdfPath) {
  const buf = fs.readFileSync(pdfPath)
  const blob = new Blob([buf], { type: 'application/pdf' })
  const fd = new FormData()
  fd.append('file', blob, `${item.slug}.pdf`)
  fd.append('title', item.title)

  const res = await fetch(`${API_BASE}/api/evaluate`, { method: 'POST', body: fd })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${JSON.stringify(json)}`)
  }
  return json
}

async function markAsSample(item, submissionId) {
  const update = {
    is_sample: true,
    sample_slug: item.slug,
    sample_author: authorFor(item),
    sample_year: item.year,
    sample_genre: item.genre,
    sample_type: item.type,
    is_public: false, // samples live on /sample, not on /discover
    expires_at: null, // never expire — they're permanent fixtures
    status: 'completed',
  }
  const { error } = await supabase
    .from('script_submissions')
    .update(update)
    .eq('id', submissionId)
  if (error) throw new Error(`Update failed: ${error.message}`)
}

async function alreadySeeded(slug) {
  const { data } = await supabase
    .from('script_submissions')
    .select('id')
    .eq('sample_slug', slug)
    .maybeSingle()
  return data?.id || null
}

async function run() {
  console.log(`Seeding ${list.length} samples → ${API_BASE}`)
  console.log(`List:  ${LIST_PATH}`)
  console.log(`PDFs:  ${PDF_DIR}`)
  console.log(`Dry:   ${DRY ? 'YES' : 'no'}\n`)

  let success = 0
  let skipped = 0
  let failed = []

  for (const item of list) {
    if (ONLY && item.slug !== ONLY) continue
    const pdfPath = path.join(PDF_DIR, `${item.slug}.pdf`)
    if (!fs.existsSync(pdfPath)) {
      console.log(`  ✗ ${item.slug}  (missing pdf)`)
      failed.push(item.slug)
      continue
    }

    const existing = await alreadySeeded(item.slug)
    if (existing) {
      console.log(`  ↺ ${item.slug}  (already seeded: ${existing})`)
      skipped++
      continue
    }

    if (DRY) {
      console.log(`  · ${item.slug}  (dry-run, would POST + mark)`)
      continue
    }

    const t0 = Date.now()
    try {
      const result = await postEvaluate(item, pdfPath)
      if (result.status !== 'completed' || !result.submission_id) {
        throw new Error(`Eval did not complete: ${JSON.stringify(result)}`)
      }
      await markAsSample(item, result.submission_id)
      const dt = Math.round((Date.now() - t0) / 1000)
      console.log(
        `  ✓ ${item.slug}  score=${result.weighted_score} tier="${result.tier}"  ${dt}s`
      )
      success++
    } catch (e) {
      console.log(`  ✗ ${item.slug}  ${e.message}`)
      failed.push(item.slug)
    }
  }

  console.log(`\nDone — success=${success} skipped=${skipped} failed=${failed.length}`)
  if (failed.length) {
    console.log('Retry with: ONLY_SLUG=<slug> node scripts/seed-samples.mjs')
    console.log('Failed:', failed.join(', '))
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
