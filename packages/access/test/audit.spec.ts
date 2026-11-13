import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { writeAdminAudit } from '../src/audit';

const MIG = path.resolve(__dirname, '..', '..', 'db', 'migrations');
let container: StartedPostgreSqlContainer;
let pg: Pool;
const ACTOR = 'aaaaaaaa-1111-4111-8111-000000000001';
const TENANT = 'otomix';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pg = new Pool({ connectionString: container.getConnectionUri() });
  for (const f of ['001_core.sql','002_rls.sql','003_global_features_jsonb.sql','004_rbac.sql','005_admin_audit_default_partition.sql']) {
    const raw = fs.readFileSync(path.join(MIG, f), 'utf8');
    const i = raw.indexOf('-- Down');
    await pg.query(i < 0 ? raw : raw.slice(0, i));
  }
  await pg.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,$2,'system_admin',1) ON CONFLICT DO NOTHING", [ACTOR, TENANT]);
}, 180_000);

afterAll(async () => { await pg?.end(); await container?.stop(); });

describe('writeAdminAudit (P06-T07-S01-M02)', () => {
  it('inserts a row with correct fields', async () => {
    await writeAdminAudit(pg, {
      actorId: ACTOR,
      tenantId: TENANT,
      action: 'dsp.parameters.update',
      detail: { before: null, after: { chopGrid: '1/16', crossfadeBeats: 0.01 } },
    });
    const r = await pg.query(
      "SELECT audit_id, tenant_id, actor_id, action, detail, at_utc FROM admin_audit WHERE actor_id=$1 AND action='dsp.parameters.update'",
      [ACTOR]
    );
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].tenant_id).toBe(TENANT);
    expect(r.rows[0].actor_id).toBe(ACTOR);
    expect(r.rows[0].action).toBe('dsp.parameters.update');
    expect(r.rows[0].detail.after.chopGrid).toBe('1/16');
    expect(r.rows[0].at_utc).not.toBeNull();
  });

  it('row lands in admin_audit or its default partition', async () => {
    const r = await pg.query("SELECT tableoid::regclass::text AS part FROM admin_audit LIMIT 1");
    expect(r.rows.length).toBeGreaterThanOrEqual(1);
    expect(String(r.rows[0].part)).toMatch(/admin_audit/);
  });

  it('rejects missing required fields', async () => {
    await expect(writeAdminAudit(pg, { actorId: '', tenantId: TENANT, action: 'x', detail: {} })).rejects.toThrow(/required/);
    await expect(writeAdminAudit(pg, { actorId: ACTOR, tenantId: '', action: 'x', detail: {} })).rejects.toThrow(/required/);
    await expect(writeAdminAudit(pg, { actorId: ACTOR, tenantId: TENANT, action: '', detail: {} })).rejects.toThrow(/required/);
  });
});