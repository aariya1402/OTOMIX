// OTOMIX 4.8; 9.5 - GAP-022
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client, Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extract } from '../src/pipeline/extract';
import type { ExtractedFeatures, ExtractRawInput } from '../src/pipeline/extract';

const TEST_TIMEOUT = 180_000;

function loadUp(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const i = raw.indexOf('-- Down');
  return i < 0 ? raw : raw.slice(0, i);
}

function goodFeatures(): ExtractedFeatures {
  return {
    bpm: 120,
    camelotKey: '1A',
    energyScalar: 0.5,
    energyStars: 3,
    mixability: 0.5,
    grooveMode: 'straight',
    registryJson: {},
  };
}

describe('extract() orchestrator (P05-T04-S01-M01)', () => {
  let container: StartedPostgreSqlContainer;
  let bootstrap: Client;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test').withUsername('test').withPassword('test').start();

    bootstrap = new Client({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });
    await bootstrap.connect();
    await bootstrap.query(loadUp('001_core.sql'));
    await bootstrap.query(loadUp('002_rls.sql'));

    pool = new Pool({ connectionString: container.getConnectionUri() });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (pool) await pool.end();
    if (bootstrap) await bootstrap.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  it('3 fixtures, 1 forced failure: 2 features + 2 outbox, failed leaves 0', async () => {
    const inputs: ExtractRawInput[] = [
      { trackId: '11111111-1111-1111-1111-111111111111', contentSha256: 'aa', schemaVersion: '1.2.0', rawAnalysis: { i: 1 } },
      { trackId: '22222222-2222-2222-2222-222222222222', contentSha256: 'bb', schemaVersion: '1.2.0', rawAnalysis: { i: 2 } },
      { trackId: '33333333-3333-3333-3333-333333333333', contentSha256: 'cc', schemaVersion: '1.2.0', rawAnalysis: { i: 3 } },
    ];

    const result = await extract(inputs, {
      pool,
      tenantId: 'otomix',
      adapter: async () => goodFeatures(),
      validator: () => ({ valid: true }),
      onBeforeOutboxInsert: async (input) => {
        if (input.contentSha256 === 'cc') throw new Error('forced failure after row insert');
      },
    });

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);

    const f = await bootstrap.query('SELECT COUNT(*)::int AS n FROM features');
    const o = await bootstrap.query('SELECT COUNT(*)::int AS n FROM outbox');
    expect(f.rows[0].n).toBe(2);
    expect(o.rows[0].n).toBe(2);

    const failedRow = await bootstrap.query(
      'SELECT COUNT(*)::int AS n FROM features WHERE track_id = $1',
      ['33333333-3333-3333-3333-333333333333'],
    );
    expect(failedRow.rows[0].n).toBe(0);
  }, TEST_TIMEOUT);

  it('rejects when validator returns invalid (no DB writes)', async () => {
    const before = await bootstrap.query('SELECT COUNT(*)::int AS n FROM features');
    const r = await extract(
      [{ trackId: '44444444-4444-4444-4444-444444444444', contentSha256: 'dd', schemaVersion: '1.2.0', rawAnalysis: {} }],
      {
        pool,
        tenantId: 'otomix',
        adapter: async () => goodFeatures(),
        validator: () => ({ valid: false, error: 'bpm out of range' }),
      },
    );
    expect(r.failed).toBe(1);
    expect(r.results[0].error).toContain('INVALID');
    const after = await bootstrap.query('SELECT COUNT(*)::int AS n FROM features');
    expect(after.rows[0].n).toBe(before.rows[0].n);
  }, TEST_TIMEOUT);
});