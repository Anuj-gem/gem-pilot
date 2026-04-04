/**
 * Re-score a single evaluation by evaluation ID.
 * Downloads the script PDF, re-runs v3 prompt, updates the DB row.
 * Bypasses cache to force a fresh evaluation.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... OPENAI_API_KEY=... \
 *   node scripts/rescore-one.js <evaluation_id>
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const EVAL_ID = process.argv[2];
if (!EVAL_ID) {
  console.error('Usage: node scripts/rescore-one.js <evaluation_id>');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

// v3 Weights
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
    weighted += (scores[dim]?.score ?? 5) * V3_WEIGHTS[dim];
  }
  return Math.round((weighted / TOTAL_WEIGHT) * 10 * 10) / 10;
}

function calculateTier(score) {
  if (score >= 85) return 'Greenlight Material';
  if (score >= 60) return 'Optionable';
  return 'Needs Development';
}

// Load v3 prompt
const promptFile = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'evaluation-prompt-v3.ts'), 'utf8'
);
const SYSTEM_PROMPT = promptFile.match(/`([\s\S]*)`/)[1];

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log(`\nRe-scoring evaluation: ${EVAL_ID}\n`);

  // 1. Fetch evaluation + joined submission
  const { data: evalRow, error: fetchErr } = await sb
    .from('script_evaluations')
    .select('id, submission_id, script_submissions(id, title, file_url)')
    .eq('id', EVAL_ID)
    .single();

  if (fetchErr || !evalRow) {
    console.error('Could not find evaluation:', fetchErr?.message ?? 'not found');
    process.exit(1);
  }

  const sub = evalRow.script_submissions;
  console.log(`Title: "${sub.title}"`);
  console.log(`Submission: ${sub.id}`);
  console.log(`File: ${sub.file_url}`);

  // 2. Download PDF
  const { data: fileData, error: dlErr } = await sb.storage
    .from('scripts')
    .download(sub.file_url);

  if (dlErr || !fileData) {
    console.error('Download failed:', dlErr?.message ?? 'no data');
    process.exit(1);
  }

  // 3. Extract text
  const pdfParse = require('pdf-parse');
  const buffer = Buffer.from(await fileData.arrayBuffer());
  const { text: scriptText } = await pdfParse(buffer);
  console.log(`Extracted ${scriptText.length} chars\n`);

  // 4. Call OpenAI
  console.log('Calling OpenAI...');
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
    console.error(`OpenAI error: ${response.status} - ${err}`);
    process.exit(1);
  }

  const data = await response.json();
  const evaluation = JSON.parse(data.choices[0].message.content);
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  // 5. Calculate score + tier
  const weightedScore = calculateWeightedScore(evaluation.scores);
  const tier = calculateTier(weightedScore);

  console.log(`Score: ${weightedScore} | Tier: ${tier}`);
  console.log(`Tokens: ${inputTokens} in / ${outputTokens} out`);

  // Verify the headline exists
  const headline = evaluation.whats_holding_it_back?.headline;
  if (!headline) {
    console.warn('\n⚠ WARNING: whats_holding_it_back.headline is still empty. You may need to re-run.');
  } else {
    console.log(`\n✓ whats_holding_it_back headline: "${headline.slice(0, 80)}..."`);
  }

  // 6. Update DB
  const { error: updateErr } = await sb
    .from('script_evaluations')
    .update({
      evaluation,
      weighted_score: weightedScore,
      tier,
      model: 'gpt-5.4-mini-v3-rescore',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })
    .eq('id', EVAL_ID);

  if (updateErr) {
    console.error('DB update failed:', updateErr.message);
    process.exit(1);
  }

  // 7. Update cache too
  const cacheDir = path.join(__dirname, '..', 'data', 'v3_rescore_cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    path.join(cacheDir, `${sub.id}.json`),
    JSON.stringify({ evaluation, weightedScore, tier, inputTokens, outputTokens }, null, 2)
  );

  console.log('\n✓ Done — evaluation updated in DB and cache.');
}

main().catch(err => { console.error(err); process.exit(1); });
