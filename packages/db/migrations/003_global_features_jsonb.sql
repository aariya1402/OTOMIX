-- 003_global_features_jsonb.sql
-- OTOMIX Global Track Metadata Library (AI Agent.MD §6)
-- This table is cross-tenant by design (indexed by audio content hash).
-- No RLS is applied here.

CREATE TABLE IF NOT EXISTS global_track_metadata (
  content_sha256 text PRIMARY KEY,
  raw_analysis_data jsonb NOT NULL DEFAULT '{}',
  analysis_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- DOWN
-- DROP TABLE IF EXISTS global_track_metadata;