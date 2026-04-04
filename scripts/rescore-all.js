/**
 * Re-score all existing evaluations using the v3 prompt (10 dimensions).
 *
 * - Downloads each script PDF from Supabase storage
 * - Extracts text
 * - Runs through v3 evaluation prompt
 * - Calculates weighted score + tier in code
 * - Updates the script_evaluations row (evaluation JSONB, weighted_score, tier)
 *
 * Usage: node scripts/rescore-all.js
 *
 * Add --dry-run to print what would happen without writing to DB.
 * Add --start-from=N to skip the first N submissions.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────
// Set these as environment variables before running:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const START_FROM = parseInt((process.argv.find(a => a.startsWith('--start-from=')) || '=0').split('=')[1]);

// ── v3 Weights (from best_config_94.53pct.json) ────────────────────
const V3_WEIGHTS = {
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
};
const TOTAL_WEIGHT = Object.values(V3_WEIGHTS).reduce((a, b) => a + b, 0);
const DIMENSION_IDS = Object.keys(V3_WEIGHTS);

function calculateWeightedScore(scores) {
  let weighted = 0;
  for (const dim of DIMENSION_IDS) {
    const s = scores[dim]?.score ?? 5;
    weighted += s * V3_WEIGHTS[dim];
  }
  return Math.round((weighted / TOTAL_WEIGHT) * 10 * 10) / 10;
}

function calculateTier(score) {
  if (score >= 85) return 'Greenlight Material';
  if (score >= 60) return 'Optionable';
  return 'Needs Development';
}

// ── Load v3 prompt ──────────────────────────────────────────────────
const promptFile = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'evaluation-prompt-v3.ts'), 'utf8'
);
const promptMatch = promptFile.match(/`([\s\S]*)`/);
const SYSTEM_PROMPT = promptMatch[1];

// ── Cache ──────────────────────────────────────────────────────────
const CACHE_DIR = path.join(__dirname, '..', 'data', 'v3_rescore_cache');
const USE_CACHE = !process.argv.includes('--no-cache');

function getCachePath(submissionId) {
  return path.join(CACHE_DIR, `${submissionId}.json`);
}

function loadCached(submissionId) {
  if (!USE_CACHE) return null;
  const p = getCachePath(submissionId);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return null;
}

function saveCache(submissionId, data) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(getCachePath(submissionId), JSON.stringify(data, null, 2));
}

// ── Main ────────────────────────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function extractPdfText(buffer) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

async function evaluateScript(scriptText) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Please evaluate the following screenplay submission:\n\n---\n\n${scriptText}` },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const evaluation = JSON.parse(data.choices[0].message.content);
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  const cost = (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5;

  return { evaluation, inputTokens, outputTokens, cost };
}

async function main() {
  console.log(`\n=== GEM v3 Re-Score ${DRY_RUN ? '(DRY RUN)' : ''} ===`);
  console.log(`Cache: ${USE_CACHE ? 'ON (use --no-cache to force re-eval)' : 'OFF'}\n`);

  // Step 0: Archive ALL current evaluations before touching anything
  console.log('Archiving original evaluations...');
  const { data: allEvals, error: archiveError } = await sb
    .from('script_evaluations')
    .select('*');

  if (archiveError) {
    console.error('Failed to fetch evaluations for archive:', archiveError);
    return;
  }

  const archivePath = path.join(__dirname, '..', 'data', 'v2_evaluation_archive.json');
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  fs.writeFileSync(archivePath, JSON.stringify(allEvals, null, 2));
  console.log(`Archived ${allEvals.length} evaluations to ${archivePath}`);

  // Get all completed submissions with files
  const { data: submissions, error } = await sb
    .from('script_submissions')
    .select('id, title, file_url, script_evaluations(id)')
    .eq('status', 'completed')
    .not('file_url', 'is', null)
    .order('created_at', { ascending: true });

  if (error) { console.error('Failed to fetch submissions:', error); return; }
  console.log(`Found ${submissions.length} submissions to re-score`);
  if (START_FROM > 0) console.log(`Skipping first ${START_FROM}`);

  let totalCost = 0;
  let success = 0;
  let failed = 0;
  let cached = 0;

  for (let i = START_FROM; i < submissions.length; i++) {
    const sub = submissions[i];
    const evalId = sub.script_evaluations?.id;
    const title = sub.title.trim();

    console.log(`\n[${i + 1}/${submissions.length}] "${title}" (${sub.id})`);

    if (!evalId) {
      console.log('  ⚠ No evaluation record — skipping');
      continue;
    }

    try {
      // Check cache first
      let result = loadCached(sub.id);

      if (result) {
        console.log(`  ♻ Using cached result (score: ${result.weightedScore}, tier: ${result.tier})`);
        cached++;
      } else {
        // Download PDF
        const { data: fileData, error: dlError } = await sb.storage
          .from('scripts')
          .download(sub.file_url);

        if (dlError || !fileData) {
          console.log(`  ⚠ Download failed: ${dlError?.message ?? 'no data'}`);
          failed++;
          continue;
        }

        // Extract text
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const scriptText = await extractPdfText(buffer);

        if (!scriptText || scriptText.trim().length < 100) {
          console.log('  ⚠ Not enough text extracted — skipping');
          failed++;
          continue;
        }

        console.log(`  Extracted ${scriptText.length} chars`);

        if (DRY_RUN) {
          console.log('  [DRY RUN] Would evaluate and update');
          continue;
        }

        // Evaluate with v3 prompt
        const { evaluation, inputTokens, outputTokens, cost } = await evaluateScript(scriptText);
        totalCost += cost;

        // Calculate score + tier
        const weightedScore = calculateWeightedScore(evaluation.scores);
        const tier = calculateTier(weightedScore);

        result = { evaluation, weightedScore, tier, inputTokens, outputTokens, cost };

        // Cache result to disk
        saveCache(sub.id, result);
        console.log(`  Score: ${weightedScore} | Tier: ${tier} | Cost: $${cost.toFixed(4)}`);
      }

      if (DRY_RUN) continue;

      // Update evaluation record
      const { error: updateError } = await sb
        .from('script_evaluations')
        .update({
          evaluation: result.evaluation,
          weighted_score: result.weightedScore,
          tier: result.tier,
          model: 'gpt-5.4-mini-v3-rescore',
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cost_usd: result.cost,
        })
        .eq('id', evalId);

      if (updateError) {
        console.log(`  ✗ Update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✓ Updated`);
        success++;
      }

      // Small delay to avoid rate limits (only if we hit the API)
      if (!loadCached(sub.id)) await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Success: ${success} | Failed: ${failed} | Cached: ${cached} | Total cost: $${totalCost.toFixed(2)}`);
}

main().catch(console.error);
