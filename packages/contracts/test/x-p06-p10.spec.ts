import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { writeAdminAudit } from '@otomix/access';

const MIG = path.resolve(__dirname, '..', '..', 'db', 'migrations');
const ACTOR = 'dddddddd-0000-4000-8000-000000000001';
let container: StartedPostgreSqlContainer;
let pg: Pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pg = new Pool({ connectionString: container.getConnectionUri() });
  for (const f of ['001_core.sql','002_rls.sql','003_global_features_jsonb.sql','004_rbac.sql','005_admin_audit_default_partition.sql']) {
    const raw = fs.readFileSync(path.join(MIG, f), 'utf8');
    const i = raw.indexOf('-- Down');
    await pg.query(i < 0 ? raw : raw.slice(0, i));
  }
  await pg.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,'otomix','system_admin',1) ON CONFLICT DO NOTHING", [ACTOR]);
}, 180_000);
afterAll(async () => { await pg?.end(); await container?.stop(); });

describe('X-P06-P10: audit no-PII + partition', () => {
  it('writeAdminAudit inserts a row with required fields', async () => {
    await writeAdminAudit(pg, {
      actorId: ACTOR, tenantId: 'otomix',
      action: 'test.action',
      detail: { user_id: ACTOR, note: 'no email here' },
    });
    const r = await pg.query("SELECT audit_id, tenant_id, actor_id, action, detail, at_utc FROM admin_audit WHERE action='test.action'");
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].actor_id).toBe(ACTOR);
  });
  it('admin_audit is partitioned (relkind=p)', async () => {
    const r = await pg.query("SELECT relkind FROM pg_class WHERE relname='admin_audit'");
    expect(r.rows[0].relkind).toBe('p');
  });
  it('detail carries no obvious PII (no email, no phone)', async () => {
    const r = await pg.query("SELECT detail FROM admin_audit WHERE action='test.action' LIMIT 1");
    const s = JSON.stringify(r.rows[0].detail);
    expect(s).not.toMatch(/@/);
    expect(s).not.toMatch(/\+\d{10,}|\(\d{3}\)\s*\d{3}-\d{4}/);
  });
});