-- 007_tracks_source_declarations.sql
-- OTOMIX §9.11 - tracks and source_declarations tables with RLS
-- Both tables carry tenant_id = 'otomix' and are under RLS

-- Up
CREATE TABLE tracks (
  track_id        uuid PRIMARY KEY,
  tenant_id       text NOT NULL CHECK (tenant_id = 'otomix'),
  owner_id        uuid NOT NULL REFERENCES users(user_id),
  content_sha256  bytea NOT NULL,
  format          text NOT NULL CHECK (format IN ('mp3','wav','flac')),
  duration_ms     integer NOT NULL CHECK (duration_ms > 0),
  storage_key     text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, owner_id, content_sha256)
);

CREATE INDEX tracks_owner_idx ON tracks (tenant_id, owner_id);

CREATE TABLE source_declarations (
  declaration_id  uuid PRIMARY KEY,
  tenant_id       text NOT NULL CHECK (tenant_id = 'otomix'),
  user_id         uuid NOT NULL REFERENCES users(user_id),
  scope           text NOT NULL CHECK (scope IN ('ingest','publish','export')),
  terms_version   text NOT NULL,
  declared_at     timestamptz NOT NULL
);

CREATE INDEX source_declarations_user_idx ON source_declarations (tenant_id, user_id);

-- RLS policies
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tracks
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE source_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_declarations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON source_declarations
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Grants
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user;
  END IF;
END
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON tracks, source_declarations TO app_user;

-- Down
DROP TABLE IF EXISTS source_declarations;
DROP TABLE IF EXISTS tracks;