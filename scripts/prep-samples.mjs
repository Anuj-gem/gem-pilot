#!/usr/bin/env node
/**
 * prep-samples.mjs
 *
 * Takes the curated sample list (sample_curated_10.json) and turns each
 * corpus .txt screenplay into a minimal PDF the GEM /api/evaluate endpoint
 * can accept. Run this BEFORE seed-samples.mjs.
 *
 * Layout expected:
 *   Selznick_3/
 *     sample_curated_10.json                 <-- curated list (slug + source)
 *     autoresearch/data/scraped_scripts/...  <-- corpus of .txt scripts
 *     sample_pdfs_10/                        <-- generated here
 *     gem-app/
 *       scripts/prep-samples.mjs             <-- this file
 *
 * Requires: pdfkit (install once):
 *   cd gem-app && npm i -D pdfkit
 *
 * Usage (from gem-app/):
 *   node scripts/prep-samples.mjs
 *   FORCE=1 node scripts/prep-samples.mjs    # regenerate even if PDF exists
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GEM_APP_DIR = path.resolve(__dirname, '..')
const REPO_DIR = path.resolve(__dirname, '..', '..')
const CORPUS_DIR = path.join(REPO_DIR, 'autoresearch', 'data', 'scraped_scripts')
const LIST_PATH = path.join(REPO_DIR, 'sample_curated_10.json')
const OUT_DIR = path.join(REPO_DIR, 'sample_pdfs_10')
const FORCE = process.env.FORCE === '1'

if (!fs.existsSync(LIST_PATH)) {
  console.error('Missing:', LIST_PATH)
  process.exit(1)
}
if (!fs.existsSync(CORPUS_DIR)) {
  console.error('Missing corpus dir:', CORPUS_DIR)
  process.exit(1)
}
fs.mkdirSync(OUT_DIR, { recursive: true })

const list = JSON.parse(fs.readFileSync(LIST_PATH, 'utf8'))

function makePdf(text, outPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    })
    const stream = fs.createWriteStream(outPath)
    doc.pipe(stream)
    doc.font('Courier').fontSize(10)
    // Normalize line endings and chunk output — pdfkit handles pagination.
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    doc.text(cleaned, { lineGap: 2 })
    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

console.log(`Prepping ${list.length} sample PDFs`)
console.log(`Corpus: ${CORPUS_DIR}`)
console.log(`Out:    ${OUT_DIR}\n`)

let made = 0
let skipped = 0
let missing = []

for (const item of list) {
  const src = path.join(CORPUS_DIR, item.source)
  const out = path.join(OUT_DIR, `${item.slug}.pdf`)

  if (!fs.existsSync(src)) {
    console.log(`  ✗ ${item.slug}  (source missing: ${item.source})`)
    missing.push(item.slug)
    continue
  }

  if (fs.existsSync(out) && !FORCE) {
    console.log(`  ↺ ${item.slug}  (pdf exists — FORCE=1 to rebuild)`)
    skipped++
    continue
  }

  const text = fs.readFileSync(src, 'utf8')
  await makePdf(text, out)
  const kb = Math.round(fs.statSync(out).size / 1024)
  console.log(`  ✓ ${item.slug}  (${text.length.toLocaleString()} chars → ${kb}KB pdf)`)
  made++
}

console.log(`\nDone — made=${made} skipped=${skipped} missing=${missing.length}`)
if (missing.length) {
  console.log('Missing sources:', missing.join(', '))
  process.exit(1)
}
console.log('\nNext: SAMPLE_LIST=../sample_curated_10.json SAMPLE_PDFS=../sample_pdfs_10 node scripts/seed-samples.mjs')
