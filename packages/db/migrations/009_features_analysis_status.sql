-- CF-01: distinguish placeholder rows from validated analysis results.
-- Up
ALTER TABLE features
  ADD COLUMN analysis_status text NOT NULL DEFAULT 'placeholder';

ALTER TABLE features
  ADD CONSTRAINT features_analysis_status_check
  CHECK (analysis_status IN ('placeholder', 'pending', 'complete'));

-- Down
ALTER TABLE features
  DROP CONSTRAINT IF EXISTS features_analysis_status_check;

ALTER TABLE features
  DROP COLUMN IF EXISTS analysis_status;
