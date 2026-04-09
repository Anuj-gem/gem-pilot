-- Writer-declared format for script submissions (Feature film | Series)
-- Added 2026-04-09: Format is now user-declared, not model-inferred.
ALTER TABLE script_submissions ADD COLUMN IF NOT EXISTS declared_format text;
