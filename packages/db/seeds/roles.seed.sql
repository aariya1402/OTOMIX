-- OTOMIX base roles (GAP-015, RBAC-M03)
-- 9 roles x 2 tenants = 18 role rows
-- role_permissions derived from permissions catalog (55 + 4 admin = 59 keys)

-- Bootstrap system users (for created_by / granted_by FK)
INSERT INTO users (user_id, tenant_id, role, tier) VALUES
  ('00000000-0000-0000-0000-000000000001', 'otomix', 'system_admin', 1),
  ('00000000-0000-0000-0000-000000000002', 'otodj', 'system_admin', 1)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO roles (role_name, description, is_system, tenant_id, created_by) VALUES
  ('regular_user', 'Default user: library, sets, mixplan, analysis, preview, download, purchase', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('tier_1', 'Tier 1: regular_user + XML export', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('tier_2', 'Tier 2 premium: tier_1 + lossless audio export + shop listing', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('dsp_specialist', 'DSP specialist admin', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('content_specialist', 'Content & licensing specialist admin', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('customer_care', 'Customer care specialist admin (read-only)', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('accountant', 'Accountant specialist admin (billing/observability)', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('deputy_admin', 'Deputy admin (all except admin:super_admin_only)', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('super_admin', 'Super admin (full control)', true, 'otomix', '00000000-0000-0000-0000-000000000001'),
  ('regular_user', 'Default user: library, sets, mixplan, analysis, preview, download, purchase', true, 'otodj', '00000000-0000-0000-0000-000000000002'),
  ('tier_1', 'Tier 1: regular_user + XML export', true, 'otodj', '00000000-0000-0000-0000-000000000002'),
  ('tier_2', 'Tier 2 premium: tier_1 + lossless audio export + shop listing', true, 'otodj', '00000000-0000-0000-0000-000000000002'),
  ('dsp_specialist', 'DSP specialist admin', true, 'otodj', '00000000-0000-0000-0000-000000000002'),
  ('content_specialist', 'Content & licensing specialist admin', true, 'otodj', '00000000-0000-0000-0000-000000000002'),
  ('customer_care', 'Customer care specialist admin (read-only)', true, 'otodj', '00000000-0000-0000-0000-000000000002'),
  ('accountant', 'Accountant specialist admin (billing/observability)', true, 'otodj', '00000000-0000-0000-0000-000000000002'),
  ('deputy_admin', 'Deputy admin (all except admin:super_admin_only)', true, 'otodj', '00000000-0000-0000-0000-000000000002'),
  ('super_admin', 'Super admin (full control)', true, 'otodj', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (role_name, tenant_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'regular_user' AND p.permission_key IN ('user:read', 'local:process', 'library:read', 'library:import', 'library:delete', 'library:manage', 'set:create', 'set:read', 'set:update', 'set:delete', 'set:publish', 'set:clone', 'mixplan:read', 'mixplan:write', 'mixplan:execute', 'mixplan:export_grid', 'analysis:run', 'analysis:read', 'preview:generate', 'preview:read', 'export:download', 'shop:buy', 'tier:read', 'store:purchase')
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'accountant' AND p.permission_key IN ('billing:read', 'billing:manage', 'observability:metrics:read', 'shop:list', 'tier:read', 'analysis:read')
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'tier_1' AND p.permission_key IN ('user:read', 'local:process', 'library:read', 'library:import', 'library:delete', 'library:manage', 'set:create', 'set:read', 'set:update', 'set:delete', 'set:publish', 'set:clone', 'mixplan:read', 'mixplan:write', 'mixplan:execute', 'mixplan:export_grid', 'analysis:run', 'analysis:read', 'preview:generate', 'preview:read', 'export:download', 'shop:buy', 'tier:read', 'store:purchase', 'export:xml')
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'customer_care' AND p.permission_key IN ('users:read', 'library:read', 'billing:read', 'set:read', 'mixplan:read', 'tier:read', 'analysis:read')
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'tier_2' AND p.permission_key IN ('user:read', 'local:process', 'library:read', 'library:import', 'library:delete', 'library:manage', 'set:create', 'set:read', 'set:update', 'set:delete', 'set:publish', 'set:clone', 'mixplan:read', 'mixplan:write', 'mixplan:execute', 'mixplan:export_grid', 'analysis:run', 'analysis:read', 'preview:generate', 'preview:read', 'export:download', 'shop:buy', 'tier:read', 'store:purchase', 'export:xml', 'export:audio', 'shop:list')
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'dsp_specialist' AND p.permission_key IN ('dsp:*', 'audio:tuning', 'mastering:*', 'analysis:run', 'analysis:read', 'analysis:recompute', 'preview:generate', 'local:process')
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'content_specialist' AND p.permission_key IN ('catalog:*', 'publisher:manage', 'publisher:landing_pages', 'takedown:submit', 'set:read', 'set:publish', 'mixplan:read')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- super_admin: ALL permissions (55 + 4 admin = 59)
INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'super_admin'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- deputy_admin: ALL except admin:super_admin_only
INSERT INTO role_permissions (role_id, permission_key, tenant_id, granted_by)
SELECT r.role_id, p.permission_key, r.tenant_id, r.created_by
FROM roles r, permissions p
WHERE r.role_name = 'deputy_admin' AND p.permission_key <> 'admin:super_admin_only'
ON CONFLICT (role_id, permission_key) DO NOTHING;

