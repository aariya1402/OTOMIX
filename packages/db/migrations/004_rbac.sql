-- RBAC Dynamic Model (GAP-015)
-- Up

CREATE TABLE permissions (
  permission_key  text PRIMARY KEY,
  category        text NOT NULL,
  description     text NOT NULL DEFAULT '',
  is_admin_only   boolean NOT NULL DEFAULT false,
  is_deprecated   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  role_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name    text NOT NULL,
  description  text NOT NULL DEFAULT '',
  is_system    boolean NOT NULL DEFAULT false,
  tenant_id    text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  created_by   uuid NOT NULL REFERENCES users(user_id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_name, tenant_id)
);

CREATE TABLE role_permissions (
  role_id        uuid NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permissions(permission_key) ON DELETE RESTRICT,
  tenant_id      text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  granted_at     timestamptz NOT NULL DEFAULT now(),
  granted_by     uuid NOT NULL REFERENCES users(user_id),
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE user_roles (
  user_id    uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tenant_id  text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  role_id    uuid NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid NOT NULL REFERENCES users(user_id),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES users(user_id),
  PRIMARY KEY (user_id, tenant_id, role_id)
);

CREATE TABLE user_permissions (
  user_id        uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tenant_id      text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  permission_key text NOT NULL REFERENCES permissions(permission_key) ON DELETE RESTRICT,
  effect         text NOT NULL CHECK (effect IN ('allow','deny')),
  granted_at     timestamptz NOT NULL DEFAULT now(),
  granted_by     uuid NOT NULL REFERENCES users(user_id),
  expires_at     timestamptz,
  revoked_at     timestamptz,
  revoked_by     uuid REFERENCES users(user_id),
  PRIMARY KEY (user_id, tenant_id, permission_key)
);

CREATE TABLE groups (
  group_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  name       text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, tenant_id)
);

CREATE TABLE group_members (
  group_id  uuid NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tenant_id text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  added_at  timestamptz NOT NULL DEFAULT now(),
  added_by  uuid NOT NULL REFERENCES users(user_id),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_permissions (
  group_id       uuid NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permissions(permission_key) ON DELETE RESTRICT,
  tenant_id      text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
  effect         text NOT NULL CHECK (effect IN ('allow','deny')),
  granted_at     timestamptz NOT NULL DEFAULT now(),
  granted_by     uuid NOT NULL REFERENCES users(user_id),
  expires_at     timestamptz,
  revoked_at     timestamptz,
  revoked_by     uuid REFERENCES users(user_id),
  PRIMARY KEY (group_id, permission_key)
);

CREATE INDEX idx_user_roles_active ON user_roles (user_id, tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_permissions_active ON user_permissions (user_id, tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_group_members_group ON group_members (group_id);
CREATE INDEX idx_group_members_user ON group_members (user_id);
CREATE INDEX idx_group_permissions_active ON group_permissions (group_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_role_permissions_role ON role_permissions (role_id);
CREATE INDEX idx_role_permissions_perm ON role_permissions (permission_key);
CREATE INDEX idx_roles_tenant ON roles (tenant_id);
CREATE INDEX idx_groups_tenant ON groups (tenant_id);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON roles
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON role_permissions
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_roles
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_permissions
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON groups
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON group_members
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON group_permissions
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles, role_permissions, user_roles, user_permissions, groups, group_members, group_permissions TO app_user;

-- Down

REVOKE ALL ON permissions FROM app_user;
REVOKE ALL ON roles, role_permissions, user_roles, user_permissions, groups, group_members, group_permissions FROM app_user;

DROP POLICY IF EXISTS tenant_isolation ON group_permissions;
DROP POLICY IF EXISTS tenant_isolation ON group_members;
DROP POLICY IF EXISTS tenant_isolation ON groups;
DROP POLICY IF EXISTS tenant_isolation ON user_permissions;
DROP POLICY IF EXISTS tenant_isolation ON user_roles;
DROP POLICY IF EXISTS tenant_isolation ON role_permissions;
DROP POLICY IF EXISTS tenant_isolation ON roles;

ALTER TABLE group_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS group_permissions;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;