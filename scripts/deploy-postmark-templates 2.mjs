/**
 * Deploy Postmark transactional templates from content/email-templates/.
 *
 * Each .md file in content/email-templates/ is the canonical copy for a
 * Postmark template, fenced into three sections by HTML comments:
 *
 *   <!-- SUBJECT -->
 *   …subject line…
 *   <!-- HTML -->
 *   …HTML body…
 *   <!-- TEXT -->
 *   …text body…
 *
 * The filename (minus .md) is the template Alias in Postmark, which is
 * also the alias used by sendEmail() in src/lib/email.ts. Same alias →
 * same template → no code changes when you update copy.
 *
 * Flow per template:
 *   1. GET  /templates/{alias} — confirm the template exists in Postmark
 *      (and that the wiring matches what the app sends).
 *   2. PUT  /templates/{alias} — overwrite Subject + HtmlBody + TextBody.
 *      If the template does NOT exist, fall back to POST /templates with
 *      the alias so the first deploy creates it.
 *
 * Usage:
 *   node scripts/deploy-postmark-templates.mjs --dry           # show diff, send nothing
 *   node scripts/deploy-postmark-templates.mjs                 # deploy ALL templates
 *   node scripts/deploy-postmark-templates.mjs --alias=post_signup    # one template
 *   node scripts/deploy-postmark-templates.mjs --alias=post_upgrade --dry
 *
 * Env (auto-loaded from .env.local):
 *   POSTMARK_SERVER_TOKEN    — required. Server Token, must have Templates write scope
 *                              (default scope on a Server Token).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

// ── Minimal .env.local loader ──────────────────────────────────────
try {
  const envRaw = await fs.readFile(path.join(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envRaw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

// ── Flags ───────────────────────────────────────────────────────────
const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run')
const aliasArg = process.argv.find((a) => a.startsWith('--alias='))
const ONLY_ALIAS = aliasArg ? aliasArg.split('=')[1] : null

const TOKEN = process.env.POSTMARK_SERVER_TOKEN
if (!TOKEN) {
  console.error('✗ POSTMARK_SERVER_TOKEN missing. Set it in .env.local.')
  process.exit(1)
}

const TEMPLATES_DIR = path.join(process.cwd(), 'content', 'email-templates')

// ── Section parser ─────────────────────────────────────────────────
function parseTemplateFile(raw) {
  // The .md file format: blocks fenced by HTML comments. We grab the
  // content between each comment and the next one (or EOF). Order is
  // expected to be SUBJECT → HTML → TEXT but we read by name to be
  // tolerant.
  const sections = {}
  const re = /<!--\s*(SUBJECT|HTML|TEXT)\s*-->([\s\S]*?)(?=<!--\s*(?:SUBJECT|HTML|TEXT)\s*-->|$)/gi
  let m
  while ((m = re.exec(raw)) !== null) {
    sections[m[1].toUpperCase()] = m[2].trim()
  }
  return sections
}

// ── Postmark API helpers ───────────────────────────────────────────
async function pmGet(pathSuffix) {
  const res = await fetch(`https://api.postmarkapp.com${pathSuffix}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Postmark-Server-Token': TOKEN,
    },
  })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) }
}

async function pmPut(pathSuffix, body) {
  const res = await fetch(`https://api.postmarkapp.com${pathSuffix}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': TOKEN,
    },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) }
}

async function pmPost(pathSuffix, body) {
  const res = await fetch(`https://api.postmarkapp.com${pathSuffix}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': TOKEN,
    },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) }
}

// ── Per-template deploy ────────────────────────────────────────────
async function deployTemplate(alias, sections) {
  console.log(`\n— ${alias}`)
  const subject = sections.SUBJECT || ''
  const html = sections.HTML || ''
  const text = sections.TEXT || ''
  if (!subject || !html || !text) {
    console.log(`  ✗ missing section(s): ${['SUBJECT','HTML','TEXT'].filter(s => !sections[s]).join(', ')}`)
    return { alias, ok: false, error: 'missing-sections' }
  }

  // 1. Check existing template
  const existing = await pmGet(`/templates/${encodeURIComponent(alias)}`)
  const exists = existing.ok && existing.body && existing.body.Alias

  if (exists) {
    const cur = existing.body
    const subjectChanged = (cur.Subject || '').trim() !== subject.trim()
    const htmlChanged = (cur.HtmlBody || '').trim() !== html.trim()
    const textChanged = (cur.TextBody || '').trim() !== text.trim()
    console.log(`  ✓ found template id=${cur.TemplateId} name="${cur.Name}"`)
    console.log(`    subject change: ${subjectChanged ? 'YES' : 'no'}`)
    console.log(`    html change:    ${htmlChanged ? 'YES' : 'no'}`)
    console.log(`    text change:    ${textChanged ? 'YES' : 'no'}`)
    if (!subjectChanged && !htmlChanged && !textChanged) {
      console.log('  · no changes — skipping update.')
      return { alias, ok: true, action: 'no-op' }
    }
  } else {
    console.log(`  · template not found in Postmark — will be created`)
  }

  if (DRY) {
    console.log('  · DRY — not sending.')
    return { alias, ok: true, action: 'dry' }
  }

  // 2. Send the update (or create)
  if (exists) {
    const r = await pmPut(`/templates/${encodeURIComponent(alias)}`, {
      Name: existing.body.Name || alias,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      // Alias preserved in URL path; not strictly required here but
      // including it is harmless and idempotent.
      Alias: alias,
    })
    if (!r.ok) {
      console.log(`  ✗ update failed: ${r.status}`, r.body)
      return { alias, ok: false, error: 'put-failed' }
    }
    console.log(`  ✓ updated template id=${r.body.TemplateId}`)
    return { alias, ok: true, action: 'updated' }
  }

  // First-time create — pretty-print the alias as the human-readable
  // Name so the Postmark dashboard reads cleanly. Anuj can rename in
  // the dashboard later if he wants.
  const r = await pmPost('/templates', {
    Name: alias,
    Alias: alias,
    Subject: subject,
    HtmlBody: html,
    TextBody: text,
    TemplateType: 'Standard',
  })
  if (!r.ok) {
    console.log(`  ✗ create failed: ${r.status}`, r.body)
    return { alias, ok: false, error: 'post-failed' }
  }
  console.log(`  ✓ created template id=${r.body.TemplateId}`)
  return { alias, ok: true, action: 'created' }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  let entries = await fs.readdir(TEMPLATES_DIR)
  entries = entries.filter((f) => f.endsWith('.md') && f !== 'README.md')
  entries.sort()

  if (ONLY_ALIAS) {
    entries = entries.filter((f) => f === `${ONLY_ALIAS}.md`)
    if (entries.length === 0) {
      console.error(`✗ No template file matches alias "${ONLY_ALIAS}". Looked for ${ONLY_ALIAS}.md in ${TEMPLATES_DIR}.`)
      process.exit(1)
    }
  }

  console.log(`Postmark template deploy${DRY ? ' (DRY RUN)' : ''}`)
  console.log(`Templates dir: ${TEMPLATES_DIR}`)
  console.log(`Files: ${entries.join(', ')}\n`)

  const results = []
  for (const file of entries) {
    const alias = file.replace(/\.md$/, '')
    const raw = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8')
    const sections = parseTemplateFile(raw)
    const result = await deployTemplate(alias, sections)
    results.push(result)
  }

  console.log('\n— summary')
  for (const r of results) {
    const tag = r.ok ? '✓' : '✗'
    const detail = r.ok ? r.action || 'ok' : r.error || 'failed'
    console.log(`  ${tag} ${r.alias}: ${detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error('✗ fatal:', err)
  process.exit(1)
})
