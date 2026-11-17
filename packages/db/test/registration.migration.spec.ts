// GAP-027; OTOMIX 7.1; 9.5
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIG_DIR = path.resolve(__dirname, '..', 'migrations');
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

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  admin = new Pool({ connectionString: container.getConnectionUri() });
  await runUp('001_core.sql');
  await runUp('002_rls.sql');
  await runUp('003_global_features_jsonb.sql');
  await runUp('008_registration.sql');
}, TEST_TIMEOUT);

afterAll(async () => {
  await admin?.end();
  await container?.stop();
}, TEST_TIMEOUT);

describe('008_registration.sql migration (GAP-027)', { timeout: 15000 }, () => {
  it('duplicate google_id rejected (UNIQUE)', async () => {
    await admin.query(
      "INSERT INTO users (user_id, tenant_id, role, tier, google_id) VALUES (gen_random_uuid(), 'otomix', 'end_user', 1, 'g-dup-1')"
    );
    await expect(
      admin.query(
        "INSERT INTO users (user_id, tenant_id, role, tier, google_id) VALUES (gen_random_uuid(), 'otomix', 'end_user', 1, 'g-dup-1')"
      )
    ).rejects.toThrow(/unique|duplicate/i);
  });

  it('valid phone_e164 accepted', async () => {
    const r = await admin.query(
      "INSERT INTO users (user_id, tenant_id, role, tier, phone_e164) VALUES (gen_random_uuid(), 'otomix', 'end_user', 1, '+989121234567') RETURNING user_id, phone_e164"
    );
    expect(r.rows[0].phone_e164).toBe('+989121234567');
  });

  it('RLS still applies (relforcerowsecurity=true)', async () => {
    const r = await admin.query(
      "SELECT relforcerowsecurity FROM pg_class WHERE relname = 'users' AND relkind = 'r'"
    );
    expect(r.rows[0].relforcerowsecurity).toBe(true);
  });
});