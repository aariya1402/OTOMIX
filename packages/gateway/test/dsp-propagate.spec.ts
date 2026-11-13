import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { enqueueDspPropagation } from '../src/dsp-propagate.ts';

const MIG = path.resolve(__dirname, '..', '..', 'db', 'migrations');
const TEN = 'otomix' as const;
const ACTOR = 'aaaaaaaa-1111-4111-8111-000000000001';
const SECRET = 'test-hmac-secret-p06-m03';

let container: StartedPostgreSqlContainer;
let pg: Pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pg = new Pool({ connectionString: container.getConnectionUri() });
  for (const f of ['001_core.sql','002_rls.sql','003_global_features_jsonb.sql','004_rbac.sql','005_admin_audit_default_partition.sql','006_dsp_parameters.sql']) {
    const raw = fs.readFileSync(path.join(MIG, f), 'utf8');
    const i = raw.indexOf('-- Down');
    await pg.query(i < 0 ? raw : raw.slice(0, i));
  }
  await pg.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,$2,'system_admin',1) ON CONFLICT DO NOTHING", [ACTOR, TEN]);
}, 180_000);

afterAll(async () => { await pg?.end(); await container?.stop(); });

describe('dsp propagation outbox (P06-T07-S01-M03)', () => {
  it('first PATCH writes outbox seq=1 with signature', async () => {
    const r = await enqueueDspPropagation(pg, {
      tenantId: TEN,
      chopGrid: '1/16',
      crossfadeBeats: 0.01,
      before: null,
      actorId: ACTOR,
      hmacSecret: SECRET,
    });
    expect(r.sequence).toBe(1);
    const row = await pg.query("SELECT payload FROM outbox WHERE message_id=$1", [r.messageId]);
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].payload.sequence).toBe(1);
    expect(typeof row.rows[0].payload.signature).toBe('string');
    expect(row.rows[0].payload.chopGrid).toBe('1/16');
  });

  it('second PATCH writes seq=2 with dsp_parameters row updated', async () => {
    const r = await enqueueDspPropagation(pg, {
      tenantId: TEN,
      chopGrid: '1/8',
      crossfadeBeats: 0.02,
      before: { chopGrid: '1/16', crossfadeBeats: 0.01 },
      actorId: ACTOR,
      hmacSecret: SECRET,
    });
    expect(r.sequence).toBe(2);
    const dp = await pg.query("SELECT chop_grid, crossfade_beats FROM dsp_parameters WHERE tenant_id=$1", [TEN]);
    expect(dp.rows[0].chop_grid).toBe('1/8');
  });

  it('per-tenant isolation: otodj has independent sequence starting at 1', async () => {
    const r = await enqueueDspPropagation(pg, {
      tenantId: 'otodj',
      chopGrid: '1/32',
      crossfadeBeats: 0.005,
      before: null,
      actorId: ACTOR,
      hmacSecret: SECRET,
    });
    expect(r.sequence).toBe(1);
  });

  it('outbox carries signatures that match HMAC-SHA256 of payload', async () => {
    const { createHmac } = await import('node:crypto');
    
    const rows = await pg.query("SELECT payload FROM outbox WHERE tenant_id=$1 ORDER BY payload->>'sequence'", [TEN]);
    expect(rows.rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows.rows) {
      const { signature, ...rest } = row.payload;
      const keys = Object.keys(rest).sort();
      const expected = createHmac('sha256', SECRET).update(JSON.stringify(rest, keys)).digest('hex');
      expect(signature).toBe(expected);
    }
  });

  it('receiver-dedup semantics: 1,2,2dup,4 -> accept,accept,drop,out_of_order', async () => {
    // Simulate consumer-side state (no Redis; inline logic mirroring receiver-dedup)
    let last = 0n;
    const seen = new Set<string>();
    const handle = (seq: bigint): string => {
      const key = seq.toString();
      if (seen.has(key)) return 'duplicate';
      if (seq > last + 1n) return 'out_of_order';
      seen.add(key);
      last = seq;
      return 'accepted';
    };
    expect(handle(1n)).toBe('accepted');
    expect(handle(2n)).toBe('accepted');
    expect(handle(2n)).toBe('duplicate');
    expect(handle(4n)).toBe('out_of_order');
  });
});