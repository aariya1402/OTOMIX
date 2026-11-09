-- Up
CREATE TABLE features (
  feature_id      uuid PRIMARY KEY,
  tenant_id       text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  track_id        uuid NOT NULL,
  schema_version  text NOT NULL,
  bpm             numeric(6,3) NOT NULL CHECK (bpm >= 60.0 AND bpm <= 200.0),
  camelot_key     text NOT NULL CHECK (camelot_key ~ '^(1[0-2]|[1-9])[AB]$'),
  energy_scalar   numeric(5,4) NOT NULL CHECK (energy_scalar BETWEEN 0 AND 1),
  energy_stars    smallint     NOT NULL CHECK (energy_stars BETWEEN 0 AND 5),
  mixability      numeric(5,4) NOT NULL CHECK (mixability BETWEEN 0 AND 1),
  groove_mode     text NOT NULL CHECK (groove_mode IN ('straight','triplet','swing')),
  registry_json   jsonb NOT NULL,
  analyzed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, track_id, schema_version)
);
CREATE INDEX features_mix_idx ON features (tenant_id, mixability, bpm);

CREATE TABLE users (
  user_id     uuid PRIMARY KEY,
  tenant_id   text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  role        text NOT NULL CHECK (role IN ('audio_dsp_admin','content_licensing_admin','system_admin','end_user')),
  tier        smallint NOT NULL CHECK (tier IN (1,2)),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tier_grants (
  grant_id     uuid PRIMARY KEY,
  tenant_id    text NOT NULL,
  user_id      uuid NOT NULL REFERENCES users(user_id),
  feature      text NOT NULL,
  expires_at   timestamptz NOT NULL
);

CREATE TABLE admin_audit (
  audit_id    uuid NOT NULL,
  tenant_id   text NOT NULL,
  actor_id    uuid NOT NULL,
  action      text NOT NULL,
  detail      jsonb NOT NULL,
  at_utc      timestamptz NOT NULL,
  PRIMARY KEY (audit_id, at_utc)
) PARTITION BY RANGE (at_utc);

CREATE TABLE admin_audit_2026_01 PARTITION OF admin_audit
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE admin_audit_2026_02 PARTITION OF admin_audit
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE admin_audit_2026_03 PARTITION OF admin_audit
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE outbox (
  message_id   uuid PRIMARY KEY,
  tenant_id    text NOT NULL,
  topic        text NOT NULL,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

-- Down
DROP TABLE IF EXISTS outbox;
DROP TABLE IF EXISTS admin_audit_2026_03;
DROP TABLE IF EXISTS admin_audit_2026_02;
DROP TABLE IF EXISTS admin_audit_2026_01;
DROP TABLE IF EXISTS admin_audit;
DROP TABLE IF EXISTS tier_grants;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS features;
