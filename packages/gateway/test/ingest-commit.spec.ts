// OTOMIX 5.1; 9.5; 9.9 - Mother 1; Add. 1-2 - GAP-014; GAP-017
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { commitIngestTransaction } from '../src/ingest/commit';
import type { CommitIngestData } from '../src/ingest/commit';
import { setTenantId } from '../src/db/tenant';

const TEST_TIMEOUT = 180_000;

const OWNER_ID = '11111111-1111-1111-1111-111111111111';
const TENANT_ID = 'otomix';

function loadUp(rel: string): string {
  const abs = join(__dirname, '..', '..', 'db', 'migrations', rel);
  const raw = readFileSync(abs, 'utf-8');
  const i = raw.indexOf('-- Down');
  return i < 0 ? raw : raw.slice(0, i);
}

function hexBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

describe('commitIngestTransaction (P07-T03-S02-M03)', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;

  const sha = 'abababababababababababababababababababababababababababababababab';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    client = new Client({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });
    await client.connect();

    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await client.query(loadUp('001_core.sql'));
    await client.query(loadUp('002_rls.sql'));

    await client.query(
      'INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1, $2, $3, $4);',
      [OWNER_ID, TENANT_ID, 'end_user', 1],
    );

    await client.query(loadUp('007_tracks_source_declarations.sql'));
    await client.query(loadUp('009_features_analysis_status.sql'));
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (client) await client.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  function baseData(): CommitIngestData {
    return {
      tenantId: TENANT_ID,
      ownerId: OWNER_ID,
      contentSha256: hexBytes(sha),
      format: 'mp3',
      durationMs: 1000,
      storageKey: 's3://bucket/' + sha + '.mp3',
    };
  }

  async function counts(): Promise<{ tracks: number; features: number; outbox: number }> {
    const t = await client.query('SELECT COUNT(*)::int AS n FROM tracks');
    const f = await client.query('SELECT COUNT(*)::int AS n FROM features');
    const o = await client.query('SELECT COUNT(*)::int AS n FROM outbox');
    return { tracks: t.rows[0].n, features: f.rows[0].n, outbox: o.rows[0].n };
  }

  it('forced failure after track insert leaves 0 rows in tracks, features, outbox', async () => {
    try {
      await client.query('BEGIN');
      await setTenantId(client, TENANT_ID);
      await commitIngestTransaction(client, baseData(), { failAfterTrackInsert: true });
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
    }
    const c1 = await counts();
    expect(c1.tracks).toBe(0);
    expect(c1.features).toBe(0);
    expect(c1.outbox).toBe(0);

  }, TEST_TIMEOUT);

  it('success: inserts 1 track, 1 feature, 1 outbox row with correct placeholder values', async () => {
    try {
      await client.query('BEGIN');
      await setTenantId(client, TENANT_ID);
      const trackId = await commitIngestTransaction(client, baseData());
      await client.query('COMMIT');
      expect(typeof trackId).toBe('string');
      expect(trackId.length).toBeGreaterThan(0);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
    const c = await counts();
    expect(c.tracks).toBe(1);
    expect(c.features).toBe(1);
    expect(c.outbox).toBe(1);

    const feat = await client.query(
      'SELECT bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, schema_version, analysis_status FROM features LIMIT 1',
    );
    expect(feat.rows.length).toBe(1);
    expect(Number(feat.rows[0].bpm)).toBe(120);
    expect(feat.rows[0].camelot_key).toBe('1A');
    expect(feat.rows[0].groove_mode).toBe('straight');
    expect(feat.rows[0].schema_version).toBe('1.2.0');
    expect(feat.rows[0].analysis_status).toBe('placeholder');

    const ob = await client.query('SELECT topic, payload FROM outbox LIMIT 1');
    expect(ob.rows[0].topic).toBe('otomix.track.ingested');
    expect(typeof ob.rows[0].payload).toBe('object');
  }, TEST_TIMEOUT);

  it('dedup hit: same content re-ingested skips features, adds outbox', async () => {
    try {
      await client.query('BEGIN');
      await setTenantId(client, TENANT_ID);
      await commitIngestTransaction(client, baseData());
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
    const c = await counts();
    expect(c.tracks).toBe(1);
    expect(c.features).toBe(1);
    expect(c.outbox).toBe(2);
  }, TEST_TIMEOUT);
});