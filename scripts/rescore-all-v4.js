/**
 * Re-score all existing evaluations using the v4 prompt.
 *
 * CRITICAL: This writes to `script_evaluations_pending` (staging), NOT
 * `script_evaluations`. The live app on main continues to read the old
 * evaluations. On cutover (positioning-rebuild → main), run the swap SQL
 * in scripts/rescore-v4-cutover.sql to promote pending into live.
 *
 * Flow:
 *  - Download each script PDF from Supabase storage
 *  - Extract text
 *  - Run through v4 evaluation prompt
 *  - Calculate weighted score + tier in code using v3 weights
 *  - Upsert into script_evaluations_pending (one row per submission_id)
 *
 * Usage:
 *   node scripts/rescore-all-v4.js              # run for real
 *   node scripts/rescore-all-v4.js --dry-run    # no DB writes, no API calls
 *   node scripts/rescore-all-v4.js --start-from=100
 *   node scripts/rescore-all-v4.js --no-cache   # force re-eval
 *
 * Env vars required:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_KEY
 *   OPENAI_API_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const START_FROM = parseInt((process.argv.find(a => a.startsWith('--start-from=')) || '=0').split('=')[1]);

// ── v3 weights (unchanged — scoring math stays the same across prompt versions) ─
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

// ── Load v4 prompt builder ──────────────────────────────────────────
// We require the compiled JS at runtime via a small loader — the file is TS,
// so we parse the template literal directly like rescore-all.js does.
const promptFile = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'evaluation-prompt-v4.ts'),
  'utf8'
);
// Extract the return `...` template literal inside buildGemEvaluationPromptV4.
const promptMatch = promptFile.match(/return `([\s\S]*?)`;\s*\n}/);
if (!promptMatch) {
  console.error('Could not extract v4 prompt template from evaluation-prompt-v4.ts');
  process.exit(1);
}
const PROMPT_TEMPLATE = promptMatch[1];

function buildPrompt(declaredFormat) {
  const formatLine =
    declaredFormat === 'Series'
      ? `The writer has declared this script as a **Series** (TV pilot). Treat format as fixed — evaluate it as a pilot for an ongoing series, not as a feature film. Genre and tone are still for you to classify.`
      : `The writer has declared this script as a **Feature film**. Treat format as fixed — evaluate it as a feature film, not as a TV pilot or series. Genre and tone are still for you to classify.`;
  return PROMPT_TEMPLATE
    .replace(/\$\{formatLine\}/g, formatLine)
    .replace(/\$\{declaredFormat\}/g, declaredFormat);
}

// ── Cache ──────────────────────────────────────────────────────────
const CACHE_DIR = path.join(__dirname, '..', 'data', 'v4_rescore_cache');
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

async function evaluateScript(scriptText, declaredFormat) {
  const systemPrompt = buildPrompt(declaredFormat || 'Feature film');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
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
  console.log(`\n=== GEM v4 Re-Score → staging ${DRY_RUN ? '(DRY RUN)' : ''} ===`);
  console.log(`Target table: script_evaluations_pending`);
  console.log(`Cache: ${USE_CACHE ? 'ON (--no-cache to force re-eval)' : 'OFF'}\n`);

  // Look up Anuj's internal @gem.studio user IDs — those submissions are
  // private test data and should be skipped.
  const { data: internalUsers, error: internalErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (internalErr) { console.error('Failed to list users:', internalErr); return; }
  const internalIds = new Set(
    (internalUsers?.users ?? [])
      .filter(u => (u.email ?? '').toLowerCase().endsWith('@gem.studio'))
      .map(u => u.id)
  );
  console.log(`Excluding ${internalIds.size} internal @gem.studio users`);

  // Fetch completed submissions with a file and an existing evaluation.
  // We re-score only scripts that already have a live evaluation — those are
  // the ones that will appear on the new app once we cut over.
  const { data: submissions, error } = await sb
    .from('script_submissions')
    .select('id, title, file_url, declared_format, user_id, script_evaluations(id, evaluation)')
    .eq('status', 'completed')
    .not('file_url', 'is', null)
    .order('created_at', { ascending: true });

  if (error) { console.error('Failed to fetch submissions:', error); return; }
  const withEval = submissions
    .filter(s => !internalIds.has(s.user_id))
    .filter(s => s.script_evaluations?.id || (Array.isArray(s.script_evaluations) && s.script_evaluations[0]?.id));
  const skippedInternal = submissions.filter(s => internalIds.has(s.user_id)).length;
  console.log(`Skipped ${skippedInternal} internal submissions. Found ${withEval.length} external submissions with evaluations to re-score`);
  if (START_FROM > 0) console.log(`Skipping first ${START_FROM}`);

  let totalCost = 0;
  let success = 0;
  let failed = 0;
  let cached = 0;

  for (let i = START_FROM; i < withEval.length; i++) {
    const sub = withEval[i];
    const title = sub.title.trim();

    // Resolve format: prefer user-declared. If null (older subs), fall back to
    // the previous evaluation's classification.format and map to Series/Feature.
    let declaredFormat;
    if (sub.declared_format === 'Series' || sub.declared_format === 'Feature film') {
      declaredFormat = sub.declared_format;
    } else {
      const prevEval = Array.isArray(sub.script_evaluations) ? sub.script_evaluations[0] : sub.script_evaluations;
      const prevFormat = (prevEval?.evaluation?.classification?.format ?? '').toLowerCase();
      declaredFormat = (prevFormat.includes('pilot') || prevFormat.includes('series')) ? 'Series' : 'Feature film';
    }

    console.log(`\n[${i + 1}/${withEval.length}] "${title}" (${sub.id}) · ${declaredFormat}`);

    try {
      let result = loadCached(sub.id);

      if (result) {
        console.log(`  ♻ Using cached (score: ${result.weightedScore}, tier: ${result.tier})`);
        cached++;
      } else {
        const { data: fileData, error: dlError } = await sb.storage
          .from('scripts')
          .download(sub.file_url);

        if (dlError || !fileData) {
          console.log(`  ⚠ Download failed: ${dlError?.message ?? 'no data'}`);
          failed++;
          continue;
        }

        const buffer = Buffer.from(await fileData.arrayBuffer());
        const scriptText = await extractPdfText(buffer);

        if (!scriptText || scriptText.trim().length < 100) {
          console.log('  ⚠ Not enough text extracted — skipping');
          failed++;
          continue;
        }

        console.log(`  Extracted ${scriptText.length} chars`);

        if (DRY_RUN) {
          console.log('  [DRY RUN] Would evaluate and upsert pending');
          continue;
        }

        const { evaluation, inputTokens, outputTokens, cost } = await evaluateScript(scriptText, declaredFormat);
        totalCost += cost;

        const weightedScore = calculateWeightedScore(evaluation.scores);
        const tier = calculateTier(weightedScore);

        result = { evaluation, weightedScore, tier, inputTokens, outputTokens, cost };
        saveCache(sub.id, result);
        console.log(`  Score: ${weightedScore} | Tier: ${tier} | Cost: $${cost.toFixed(4)}`);
      }

      if (DRY_RUN) continue;

      // Upsert into staging table (one row per submission_id)
      const { error: upsertError } = await sb
        .from('script_evaluations_pending')
        .upsert({
          submission_id: sub.id,
          evaluation: result.evaluation,
          weighted_score: result.weightedScore,
          tier: result.tier,
          model: 'gpt-5.4-mini-v4',
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cost_usd: result.cost,
        }, { onConflict: 'submission_id' });

      if (upsertError) {
        console.log(`  ✗ Upsert failed: ${upsertError.message}`);
        failed++;
      } else {
        console.log(`  ✓ Staged`);
        success++;
      }

      if (!loadCached(sub.id)) await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Success: ${success} | Failed: ${failed} | Cached: ${cached} | Total cost: $${totalCost.toFixed(2)}`);
  console.log(`\nStaging table: script_evaluations_pending`);
  console.log(`Cutover SQL: scripts/rescore-v4-cutover.sql (run after merging to main)`);
}

main().catch(console.error);
