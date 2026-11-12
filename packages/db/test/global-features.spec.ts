import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GlobalFeaturesRepository } from '../../core/src/repository/global-features';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(__dirname, '..', 'migrations', '003_global_features_jsonb.sql');

describe('GlobalFeaturesRepository (Integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repository: GlobalFeaturesRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    
    // Run the migration
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    
    repository = new GlobalFeaturesRepository(pool);
  }, 60000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
  });

  it('T1: inserts heterogeneous JSON data and reads it back without loss', async () => {
    const hash = 'aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666gggg7777hhhh8888';
    const data = {
      bpm: 120,
      artist: 'Daft Punk',
      spotify_data: { popularity: 85, genres: ['electronic'] },
    };
    
    await repository.upsertFeature(hash, data, '1.0.0');
    const record = await repository.getFeature(hash);
    
    expect(record).not.toBeNull();
    if (record) {
      expect(record.contentSha256).toBe(hash);
      expect(record.analysisVersion).toBe('1.0.0');
      expect(record.rawAnalysisData).toEqual(data);
    }
  });

  it('T2: updates analysis_version and preserves data', async () => {
    const hash = 'aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666gggg7777hhhh8888';
    const newData = { bpm: 124, artist: 'Daft Punk' };
    
    await repository.upsertFeature(hash, newData, '1.1.0');
    const record = await repository.getFeature(hash);
    
    expect(record).not.toBeNull();
    if (record) {
      expect(record.analysisVersion).toBe('1.1.0');
      expect(record.rawAnalysisData).toEqual(newData);
    }
  });
});