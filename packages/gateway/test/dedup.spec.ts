import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { checkDedup, generateTrackId, upsertTrackDedup } from '../src/ingest/dedup';

const TEST_TIMEOUT = 180_000;

describe('checkDedup (P07-T03-S02-M01)', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;

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

    const fileContent = readFileSync(join(__dirname, '../../db/migrations/007_tracks_source_declarations.sql'), 'utf-8');
    const upSql = fileContent.split('-- Down')[0]!;

    await client.query(`
      CREATE TABLE users (
        user_id uuid PRIMARY KEY
      );
      INSERT INTO users (user_id) VALUES
        ('11111111-1111-1111-1111-111111111111'),
        ('33333333-3333-3333-3333-333333333333');
    `);
    await client.query(upSql);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (client) await client.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  it('returns exists=false for new hash', async () => {
    const hash = Buffer.from('deadbeef', 'hex');
    const result = await checkDedup(client, 'otomix', '11111111-1111-1111-1111-111111111111', hash);
    expect(result.exists).toBe(false);
  });

  it('returns exists=true for existing hash', async () => {
    const trackId = generateTrackId();
    const hash = Buffer.from('deadbeef', 'hex');

    await client.query(
      `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
       VALUES ($1, 'otomix', $2, $3, 'mp3', 1000, 's3://key')`,
      [trackId, '11111111-1111-1111-1111-111111111111', hash]
    );

    const result = await checkDedup(client, 'otomix', '11111111-1111-1111-1111-111111111111', hash);
    expect(result.exists).toBe(true);
  });

  it('different owner with same hash -> different track (no dedup across owners)', async () => {
    const trackId2 = generateTrackId();
    const hash = Buffer.from('deadbeef', 'hex');

    await client.query(
      `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
       VALUES ($1, 'otomix', $2, $3, 'mp3', 1000, 's3://key')`,
      [trackId2, '33333333-3333-3333-3333-333333333333', hash]
    );

    const result1 = await checkDedup(client, 'otomix', '33333333-3333-3333-3333-333333333333', hash);
    const result2 = await checkDedup(client, 'otomix', '11111111-1111-1111-1111-111111111111', Buffer.from('cafebabe', 'hex'));
    
    expect(result1.exists).toBe(true);
    expect(result2.exists).toBe(false);
  });

  it('generateTrackId produces valid UUID', () => {
    const id = generateTrackId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('upsertTrackDedup returns isNew=true then isNew=false', async () => {
    const hash = Buffer.from('cafebabe', 'hex');
    const owner = '11111111-1111-1111-1111-111111111111';

    const res1 = await upsertTrackDedup(client, 'otomix', owner, hash, 'wav', 1000, 's3://key1');
    expect(res1.isNew).toBe(true);
    expect(res1.trackId).toBeDefined();

    const res2 = await upsertTrackDedup(client, 'otomix', owner, hash, 'flac', 1000, 's3://key2');
    expect(res2.isNew).toBe(false);
    expect(res2.trackId).toBe(res1.trackId);
  });
});