-- Up
-- Application role without BYPASSRLS, does not own tables
CREATE ROLE app_user LOGIN PASSWORD 'app_user_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

-- Enable and force RLS on all tenant-carrying tables
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE features FORCE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE tier_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox FORCE ROW LEVEL SECURITY;

-- tenant_isolation policy on each table
CREATE POLICY tenant_isolation ON features
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY tenant_isolation ON tier_grants
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY tenant_isolation ON admin_audit
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY tenant_isolation ON outbox
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Explicit grants (avoids schema_migrations exposure that ALL TABLES would cause)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  features, users, tier_grants, admin_audit, outbox,
  admin_audit_2026_01, admin_audit_2026_02, admin_audit_2026_03
  TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- Down
REVOKE ALL ON
  features, users, tier_grants, admin_audit, outbox,
  admin_audit_2026_01, admin_audit_2026_02, admin_audit_2026_03
  FROM app_user;
REVOKE USAGE ON SCHEMA public FROM app_user;

DROP POLICY IF EXISTS tenant_isolation ON outbox;
DROP POLICY IF EXISTS tenant_isolation ON admin_audit;
DROP POLICY IF EXISTS tenant_isolation ON tier_grants;
DROP POLICY IF EXISTS tenant_isolation ON users;
DROP POLICY IF EXISTS tenant_isolation ON features;

ALTER TABLE outbox DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit DISABLE ROW LEVEL SECURITY;
ALTER TABLE tier_grants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE features DISABLE ROW LEVEL SECURITY;

DROP ROLE IF EXISTS app_user;