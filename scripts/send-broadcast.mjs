#!/usr/bin/env node
/**
 * SEND BROADCAST
 *
 * Run after pushing code when you've added a new opportunity.
 *
 * Usage:
 *   cd gem-app
 *   node scripts/send-broadcast.mjs talent-rep-high-concept-writers
 */

import { execSync } from "child_process"

const SITE_URL = "https://gem-pilot.vercel.app"
const slug = process.argv[2]

if (!slug) {
  console.error("Give me the opportunity slug:")
  console.error("  node scripts/send-broadcast.mjs talent-rep-high-concept-writers")
  process.exit(1)
}

console.log("\n━━━ Step 1: Deploy email templates to Postmark ━━━\n")
try {
  execSync("node scripts/deploy-postmark-templates.mjs", { stdio: "inherit", cwd: process.cwd() })
  console.log("\n✓ Templates deployed.\n")
} catch (e) {
  console.error("✗ Template deploy failed. Fix the error above and re-run.")
  process.exit(1)
}

console.log(`━━━ Step 2: Broadcast "${slug}" to all users ━━━\n`)

try {
  const res = await fetch(`${SITE_URL}/api/cron/opportunity-broadcast?slug=${slug}`, {
    method: "POST",
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`✗ Broadcast failed (${res.status}):`, data)
    process.exit(1)
  }
  if (data.sent === 0 && data.opportunities === 0) {
    console.error(`✗ No opportunity found with slug "${slug}". Check the slug is correct.`)
    process.exit(1)
  }
  console.log(`✓ Done! Sent ${data.sent} emails for "${slug}".`)
  console.log(`  (${data.skipped} skipped — already received)\n`)
} catch (e) {
  console.error("✗ Broadcast request failed:", e.message)
  process.exit(1)
}
