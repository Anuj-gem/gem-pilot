#!/usr/bin/env node
/**
 * seed-sopranos.mjs
 *
 * Seeds The Sopranos pilot as a sample evaluation.
 *
 * Two-step flow:
 *   1. POST /api/start-submission  → creates row + uploads PDF
 *   2. POST /api/score-submission  → runs OpenAI eval, writes script_evaluations
 *   3. Mark row as sample via Supabase service client
 *
 * Env vars (from gem-app/.env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   GEM_API_BASE  (default: https://gem-pilot.vercel.app)
 *
 * Usage (from gem-app/):
 *   node scripts/seed-sopranos.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GEM_APP_DIR = path.resolve(__dirname, '..')
const REPO_DIR = path.resolve(__dirname, '..', '..')

// ── Env loading ─────────────────────────────────────────────────────
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
  console.error('These must be in gem-app/.env.local or exported in your shell.')
  process.exit(1)
}

const API_BASE = process.env.GEM_API_BASE || 'https://gem-pilot.vercel.app'
const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
})

// ── Sample metadata ─────────────────────────────────────────────────
const SAMPLE = {
  title: 'The Sopranos',
  slug: 'the-sopranos',
  author: 'David Chase',
  year: 1999,
  genre: 'Drama',
  type: 'TV Pilot',
  declared_format: 'Series',
}

// ── Find the PDF ────────────────────────────────────────────────────
const PDF_CANDIDATES = [
  path.join(REPO_DIR, 'sample_pdfs', 'the-sopranos.pdf'),
  path.join(REPO_DIR, 'autoresearch', 'pdf_backup', 'the-sopranos-101-piot-1999.pdf'),
  path.join(REPO_DIR, 'autoresearch', 'data', 'uploads', 'e808d993-caac-4975-b079-4134a10e0555', 'the-sopranos-101-piot-1999.pdf'),
]

function findPdf() {
  for (const p of PDF_CANDIDATES) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// ── Main ────────────────────────────────────────────────────────────
async function run() {
  // 0. Check if already seeded
  const { data: existing } = await supabase
    .from('script_submissions')
    .select('id')
    .eq('sample_slug', SAMPLE.slug)
    .maybeSingle()

  if (existing) {
    console.log(`Already seeded: ${SAMPLE.slug} (id=${existing.id})`)
    console.log('Delete the row first if you want to re-seed.')
    return
  }

  // 1. Find the PDF
  const pdfPath = findPdf()
  if (!pdfPath) {
    console.error('Could not find Sopranos PDF. Looked in:')
    PDF_CANDIDATES.forEach((p) => console.error('  ' + p))
    process.exit(1)
  }
  console.log(`PDF: ${pdfPath}`)

  // 2. Upload via /api/start-submission
  console.log(`Uploading to ${API_BASE}/api/start-submission ...`)
  const buf = fs.readFileSync(pdfPath)
  const blob = new Blob([buf], { type: 'application/pdf' })
  const fd = new FormData()
  fd.append('file', blob, 'the-sopranos.pdf')
  fd.append('title', SAMPLE.title)
  fd.append('declared_format', SAMPLE.declared_format)

  const startRes = await fetch(`${API_BASE}/api/start-submission`, {
    method: 'POST',
    body: fd,
  })
  const startJson = await startRes.json().catch(() => ({}))
  if (!startRes.ok) {
    throw new Error(`start-submission ${startRes.status}: ${JSON.stringify(startJson)}`)
  }
  const submissionId = startJson.submission_id
  console.log(`Created submission: ${submissionId}`)

  // 3. Score via /api/score-submission
  console.log(`Scoring via ${API_BASE}/api/score-submission ... (this takes 30-60s)`)
  const t0 = Date.now()
  const scoreRes = await fetch(`${API_BASE}/api/score-submission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submission_id: submissionId }),
  })
  const scoreJson = await scoreRes.json().catch(() => ({}))
  if (!scoreRes.ok) {
    throw new Error(`score-submission ${scoreRes.status}: ${JSON.stringify(scoreJson)}`)
  }
  const dt = Math.round((Date.now() - t0) / 1000)
  console.log(`Scored in ${dt}s — score=${scoreJson.weighted_score} tier="${scoreJson.tier}"`)

  // 4. Mark as sample
  console.log('Marking as sample...')
  const { error: updateError } = await supabase
    .from('script_submissions')
    .update({
      is_sample: true,
      sample_slug: SAMPLE.slug,
      sample_author: SAMPLE.author,
      sample_year: SAMPLE.year,
      sample_genre: SAMPLE.genre,
      sample_type: SAMPLE.type,
      is_public: false,
      expires_at: null,
    })
    .eq('id', submissionId)

  if (updateError) {
    throw new Error(`Failed to mark as sample: ${updateError.message}`)
  }

  console.log(`\n✓ Done — ${SAMPLE.title} seeded as /sample/${SAMPLE.slug}`)
  console.log(`  submission_id: ${submissionId}`)
  console.log(`  score: ${scoreJson.weighted_score}`)
  console.log(`  tier: ${scoreJson.tier}`)
}

run().catch((e) => {
  console.error('\n✗ Failed:', e.message)
  process.exit(1)
})
