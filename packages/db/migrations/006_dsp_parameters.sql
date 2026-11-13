-- Up
CREATE TABLE tenant_sequences (
  tenant_id text PRIMARY KEY CHECK (tenant_id IN ('otomix','otodj')),
  sequence  bigint NOT NULL DEFAULT 0
);
INSERT INTO tenant_sequences (tenant_id) VALUES ('otomix'), ('otodj') ON CONFLICT DO NOTHING;
ALTER TABLE tenant_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sequences FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_sequences
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_sequences TO app_user;

CREATE TABLE dsp_parameters (
  tenant_id       text PRIMARY KEY CHECK (tenant_id IN ('otomix','otodj')),
  chop_grid       text NOT NULL,
  crossfade_beats numeric NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dsp_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsp_parameters FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON dsp_parameters
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON dsp_parameters TO app_user;

-- Down
DROP TABLE IF EXISTS dsp_parameters;
DROP TABLE IF EXISTS tenant_sequences;