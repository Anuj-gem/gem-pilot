-- GEM v4 re-score cutover
-- Run this AFTER merging positioning-rebuild → main, so the live app is
-- on the new code that expects v4-shaped `evaluation` JSON.
--
-- What it does:
--   1. Archives every current script_evaluations row into
--      script_evaluations_archive_v3 (safety net — you can roll back).
--   2. Updates script_evaluations in place from script_evaluations_pending
--      (preserves evaluation ids, so all /report/<id> links keep working).
--   3. Leaves script_evaluations_pending intact so you can compare or re-run.
--
-- To roll back: TRUNCATE script_evaluations, then INSERT from archive.

BEGIN;

-- 1. Archive current live evaluations (if not already archived)
CREATE TABLE IF NOT EXISTS script_evaluations_archive_v3 AS
  SELECT * FROM script_evaluations WHERE false;

INSERT INTO script_evaluations_archive_v3
SELECT se.*
FROM script_evaluations se
LEFT JOIN script_evaluations_archive_v3 a ON a.id = se.id
WHERE a.id IS NULL;

-- 2. Promote pending rows → live (preserves existing evaluation.id per submission)
UPDATE script_evaluations se
SET
  evaluation    = p.evaluation,
  weighted_score = p.weighted_score,
  tier          = p.tier,
  model         = p.model,
  input_tokens  = p.input_tokens,
  output_tokens = p.output_tokens,
  cost_usd      = p.cost_usd
FROM script_evaluations_pending p
WHERE p.submission_id = se.submission_id;

-- 3. Sanity: count rows updated
SELECT
  (SELECT COUNT(*) FROM script_evaluations_pending) AS staged,
  (SELECT COUNT(*) FROM script_evaluations_archive_v3) AS archived;

COMMIT;
