-- Add 'awaiting_pdf' to the script_submissions.status enum.
--
-- New status for the guided submit flow: a writer creates a draft (format +
-- account) without uploading their PDF. The row sits as awaiting_pdf until
-- they come back and upload, at which point it transitions through the normal
-- pending -> processing -> completed lifecycle.

ALTER TABLE script_submissions
  DROP CONSTRAINT IF EXISTS script_submissions_status_check;

ALTER TABLE script_submissions
  ADD CONSTRAINT script_submissions_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'awaiting_pdf'));
