import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client, Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FeaturesExtractionRepository } from '../src/features-extraction-repository.js';

const TEST_TIMEOUT = 180_000;

function loadUp(file: string): string {
  return readFileSync(join(__dirname, '..', 'migrations', file), 'utf8').split('-- Down')[0];
}

describe('FeaturesExtractionRepository', () => {
  let container: StartedPostgreSqlContainer;
  let admin: Client;
  let pool: Pool;
  let repository: FeaturesExtractionRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    admin = new Client({ connectionString: container.getConnectionUri() });
    await admin.connect();
    await admin.query(loadUp('001_core.sql'));
    await admin.query(loadUp('002_rls.sql'));
    await admin.query(
      `INSERT INTO features (
         feature_id, tenant_id, track_id, schema_version, bpm, camelot_key,
         energy_scalar, energy_stars, mixability, groove_mode, registry_json
       ) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'otomix',
                 '77777777-7777-7777-7777-777777777777', '1.2.0',
                 120, '1A', 0.5, 3, 0.5, 'straight', '{"looks_real":true}')`,
    );
    await admin.query(loadUp('009_features_analysis_status.sql'));
    pool = new Pool({ connectionString: container.getConnectionUri() });
    repository = new FeaturesExtractionRepository(pool);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (pool) await pool.end();
    if (admin) await admin.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  it('does not trust pre-migration registry data as complete without provenance', async () => {
    const result = await admin.query(
      "SELECT analysis_status FROM features WHERE track_id = '77777777-7777-7777-7777-777777777777'",
    );
    expect(result.rows[0].analysis_status).toBe('placeholder');
  });

  it('replaces placeholder values and writes complete features plus outbox atomically', async () => {
    const trackId = '55555555-5555-5555-5555-555555555555';
    const featureId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await admin.query(
      `INSERT INTO features (
         feature_id, tenant_id, track_id, schema_version, bpm, camelot_key,
         energy_scalar, energy_stars, mixability, groove_mode, registry_json
       ) VALUES ($1, 'otomix', $2, '1.2.0', 120, '1A', 0.5, 3, 0.5, 'straight', '{}')`,
      [featureId, trackId],
    );

    const result = await repository.persist({
      tenantId: 'otomix',
      trackId,
      contentSha256: 'hash-1',
      schemaVersion: '1.2.0',
      features: {
        bpm: 132,
        camelotKey: '2A',
        energyScalar: 0.8,
        energyStars: 4,
        mixability: 0.7,
        grooveMode: 'straight',
        registryJson: { bpm: 132 },
      },
    });

    const feature = await admin.query(
      'SELECT feature_id, bpm, camelot_key, analysis_status FROM features WHERE track_id = $1',
      [trackId],
    );
    const outbox = await admin.query('SELECT payload FROM outbox');
    expect(result.featureId).toBe(featureId);
    expect(feature.rows).toEqual([{
      feature_id: featureId,
      bpm: '132.000',
      camelot_key: '2A',
      analysis_status: 'complete',
    }]);
    expect(outbox.rows).toHaveLength(1);
    expect(outbox.rows[0].payload.track_id).toBe(trackId);
  }, TEST_TIMEOUT);

  it('rolls back the feature update if the outbox insert fails', async () => {
    const trackId = '66666666-6666-6666-6666-666666666666';
    await admin.query(`
      CREATE FUNCTION reject_extracted_outbox() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'forced outbox failure'; END;
      $$;
      CREATE TRIGGER reject_extracted_outbox BEFORE INSERT ON outbox
      FOR EACH ROW EXECUTE FUNCTION reject_extracted_outbox();
    `);

    await expect(repository.persist({
      tenantId: 'otomix',
      trackId,
      contentSha256: 'hash-2',
      schemaVersion: '1.2.0',
      features: {
        bpm: 120,
        camelotKey: '1A',
        energyScalar: 0.5,
        energyStars: 3,
        mixability: 0.5,
        grooveMode: 'straight',
        registryJson: {},
      },
    })).rejects.toThrow('forced outbox failure');

    await admin.query('DROP TRIGGER reject_extracted_outbox ON outbox');
    await admin.query('DROP FUNCTION reject_extracted_outbox()');
    const result = await admin.query('SELECT COUNT(*)::int AS count FROM features WHERE track_id = $1', [trackId]);
    expect(result.rows[0].count).toBe(0);
  }, TEST_TIMEOUT);
});