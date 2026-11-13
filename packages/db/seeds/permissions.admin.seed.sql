-- OTOMIX admin permissions (GAP-015, RBAC-M03)
-- Additive to permissions.seed.sql. Runs BEFORE permissions.seed.sql? No, AFTER (alphabetical: 'a' < 's'?? -- Actually: 'permissions.admin' vs 'permissions.seed': at position after 'permissions.', 'a'(97) < 's'(115) so admin runs FIRST).
-- Both run before roles.seed.sql, so all 59 keys exist by the time role_permissions is inserted.
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO permissions (permission_key, category, description, is_admin_only, is_deprecated) VALUES
  ('admin:user_grants', 'admin', 'Grant or revoke user permissions, roles, and groups', true, false),
  ('admin:permissions_catalog', 'admin', 'Manage the atomic permissions catalog (add/deprecate)', true, false),
  ('admin:roles_manage', 'admin', 'Create, edit, delete roles and their permission bundles', true, false),
  ('admin:super_admin_only', 'admin', 'Marker: actions restricted to super_admin only (not deputy_admin)', true, false)
ON CONFLICT (permission_key) DO NOTHING;

