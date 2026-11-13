// GAP-015, RBAC-M02
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ROUTE_SCOPES } from '../../gateway/src/scopes';

const MIG_DIR = path.resolve(__dirname, '..', 'migrations');
const SEED_PATH = path.resolve(__dirname, '..', 'seeds', 'permissions.seed.sql');
const TEST_TIMEOUT = 180_000;

let container: StartedPostgreSqlContainer;
let admin: Pool;

function readMig(name: string): { up: string; down: string } {
  const raw = fs.readFileSync(path.join(MIG_DIR, name), 'utf8');
  const idx = raw.indexOf('-- Down');
  if (idx < 0) return { up: raw, down: '' };
  return { up: raw.slice(0, idx), down: raw.slice(idx + '-- Down'.length) };
}
async function runUp(name: string): Promise<void> {
  const { up } = readMig(name);
  await admin.query(up);
}
async function runSeed(): Promise<void> {
  const sql = fs.readFileSync(SEED_PATH, 'utf8');
  await admin.query(sql);
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  admin = new Pool({ connectionString: container.getConnectionUri() });
  await runUp('001_core.sql');
  await runUp('002_rls.sql');
  await runUp('003_global_features_jsonb.sql');
  await runUp('004_rbac.sql');
}, TEST_TIMEOUT);

afterAll(async () => {
  await admin?.end();
  await container?.stop();
}, TEST_TIMEOUT);

describe('permissions.seed.sql (RBAC-M02)', () => {
  it('idempotent: running seed twice does not change row count', async () => {
    await runSeed();
    const c1 = await admin.query("SELECT COUNT(*)::int AS c FROM permissions");
    await runSeed();
    const c2 = await admin.query("SELECT COUNT(*)::int AS c FROM permissions");
    expect(c2.rows[0].c).toBe(c1.rows[0].c);
    expect(c1.rows[0].c).toBeGreaterThanOrEqual(40);
  });

  it('every permission_key is non-empty and unique', async () => {
    const r = await admin.query("SELECT permission_key FROM permissions");
    const keys = r.rows.map((x: { permission_key: string }) => x.permission_key);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) { expect(k.length).toBeGreaterThan(0); }
    const dupes = await admin.query("SELECT permission_key, COUNT(*)::int AS c FROM permissions GROUP BY permission_key HAVING COUNT(*) > 1");
    expect(dupes.rows.length).toBe(0);
  });

  it('every category is non-null and non-empty', async () => {
    const r = await admin.query("SELECT COUNT(*)::int AS c FROM permissions WHERE category IS NULL OR category = ''");
    expect(r.rows[0].c).toBe(0);
  });

  it('every row has non-empty description and boolean is_admin_only', async () => {
    const r = await admin.query("SELECT COUNT(*)::int AS c FROM permissions WHERE description IS NULL OR description = ''");
    expect(r.rows[0].c).toBe(0);
    const r2 = await admin.query("SELECT COUNT(*)::int AS c FROM permissions WHERE is_admin_only IS NULL");
    expect(r2.rows[0].c).toBe(0);
  });

  it('every route scope in ROUTE_SCOPES exists in the catalog (no drift)', async () => {
    const routeScopes = new Set<string>();
    for (const entry of ROUTE_SCOPES) {
      for (const s of entry.scopes) { routeScopes.add(s); }
    }
    const r = await admin.query("SELECT permission_key FROM permissions");
    const catalogKeys = new Set<string>(r.rows.map((x: { permission_key: string }) => x.permission_key));
    const missing: string[] = [];
    for (const s of routeScopes) { if (!catalogKeys.has(s)) { missing.push(s); } }
    expect(missing).toEqual([]);
  });

  it('base-role required keys are all present', async () => {
    const requiredForRoles = [
      'user:read','local:process','library:read','library:import','library:delete','library:manage',
      'set:create','set:read','set:update','set:delete','set:publish','set:clone',
      'mixplan:read','mixplan:write','mixplan:execute','mixplan:export_grid',
      'analysis:run','analysis:read','preview:generate','preview:read',
      'export:download','export:xml','export:audio','shop:buy','shop:list','tier:read','tier:grant',
      'dsp:*','audio:tuning','mastering:*','catalog:*','publisher:manage','publisher:landing_pages',
      'shop:manage','takedown:submit','takedown:review','takedown:execute',
      'users:read','users:write','users:*','sys:*','sys:read','billing:read','billing:manage','billing:*',
      'feature:flags:write','cache:flush','admin:audit:read','admin:audit:export','admin:health',
      'observability:metrics:read','observability:traces:read','store:purchase'
    ];
    const r = await admin.query("SELECT permission_key FROM permissions");
    const catalogKeys = new Set<string>(r.rows.map((x: { permission_key: string }) => x.permission_key));
    const missing = requiredForRoles.filter((k) => !catalogKeys.has(k));
    expect(missing).toEqual([]);
  });
});