import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_TIMEOUT = 180_000;
const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_HASH = Buffer.from('deadbeef', 'hex');

describe('Migration 007_tracks_source_declarations', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;
  let upSql: string;
  let downSql: string;

  beforeAll(async () => {
    const fileContent = readFileSync(join(__dirname, '../migrations/007_tracks_source_declarations.sql'), 'utf-8');
    const parts = fileContent.split('-- Down');
    upSql = parts[0]!;
    downSql = parts[1] || '';

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

    // Apply minimal prerequisite: users table (needed for FK)
    await client.query(`
      DROP TABLE IF EXISTS users;
      CREATE TABLE users (
        user_id     uuid PRIMARY KEY,
        tenant_id   text NOT NULL CHECK (tenant_id IN ('otomix','otodj')),
        role        text NOT NULL CHECK (role IN ('audio_dsp_admin','content_licensing_admin','system_admin','end_user')),
        tier        smallint NOT NULL CHECK (tier IN (1,2)),
        created_at  timestamptz NOT NULL DEFAULT now()
      );
    `);
    // Insert mock user for foreign key references
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1, 'otomix', 'end_user', 1)`,
      [MOCK_USER_ID]
    );
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Clean up tracks and source_declarations before each test (users table persists)
    await client.query(`DROP TABLE IF EXISTS source_declarations;`);
    await client.query(`DROP TABLE IF EXISTS tracks;`);
  });

  afterAll(async () => {
    if (client) await client.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  it('applies up migration successfully', async () => {
    await client.query(upSql);
    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    const tableNames = tables.rows.map((r: { tablename: string }) => r.tablename);
    expect(tableNames).toContain('tracks');
    expect(tableNames).toContain('source_declarations');
  }, TEST_TIMEOUT);

  it('rejects format=ogg (invalid CHECK)', async () => {
    await client.query(upSql);
    await expect(
      client.query(
        `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
           VALUES (gen_random_uuid(), 'otomix', $1, $2, 'ogg', 1000, 's3://key')`,
        [MOCK_USER_ID, MOCK_HASH]
      )
    ).rejects.toThrow(/check constraint/i);
  }, TEST_TIMEOUT);

  it('rejects duration_ms=0 (must be > 0)', async () => {
    await client.query(upSql);
    await expect(
      client.query(
        `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
           VALUES (gen_random_uuid(), 'otomix', $1, $2, 'mp3', 0, 's3://key')`,
        [MOCK_USER_ID, MOCK_HASH]
      )
    ).rejects.toThrow(/check constraint/i);
  }, TEST_TIMEOUT);

  it('rejects tenant_id=otodj (must be otomix)', async () => {
    await client.query(upSql);
    await expect(
      client.query(
        `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
           VALUES (gen_random_uuid(), 'otodj', $1, $2, 'mp3', 1000, 's3://key')`,
        [MOCK_USER_ID, MOCK_HASH]
      )
    ).rejects.toThrow(/check constraint/i);
  }, TEST_TIMEOUT);

  it('rejects duplicate (tenant_id, owner_id, content_sha256)', async () => {
    await client.query(upSql);
    await client.query(
      `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
         VALUES (gen_random_uuid(), 'otomix', $1, $2, 'mp3', 1000, 's3://key')`,
      [MOCK_USER_ID, MOCK_HASH]
    );
    await expect(
      client.query(
        `INSERT INTO tracks (track_id, tenant_id, owner_id, content_sha256, format, duration_ms, storage_key)
           VALUES (gen_random_uuid(), 'otomix', $1, $2, 'wav', 2000, 's3://other')`,
        [MOCK_USER_ID, MOCK_HASH]
      )
    ).rejects.toThrow(/unique/i);
  }, TEST_TIMEOUT);

  it('rejects source_declarations scope=invalid', async () => {
    await client.query(upSql);
    await expect(
      client.query(
        `INSERT INTO source_declarations (declaration_id, tenant_id, user_id, scope, terms_version, declared_at)
           VALUES (gen_random_uuid(), 'otomix', $1, 'invalid', '1.0', now())`,
        [MOCK_USER_ID]
      )
    ).rejects.toThrow(/check constraint/i);
  }, TEST_TIMEOUT);

  it('verifies CHECK constraints via information_schema', async () => {
    await client.query(upSql);
    const result = await client.query(
      `SELECT cc.check_clause
         FROM information_schema.check_constraints cc
         JOIN information_schema.constraint_column_usage ccu
           ON cc.constraint_name = ccu.constraint_name
         WHERE ccu.table_name IN ('tracks', 'source_declarations')`
    );
    const clauses = result.rows.map((r: { check_clause: string }) => r.check_clause).join(' ');
    expect(clauses).toMatch(/format/i);
    expect(clauses).toMatch(/duration_ms/i);
    expect(clauses).toMatch(/tenant_id/i);
    expect(clauses).toMatch(/scope/i);
  }, TEST_TIMEOUT);

  it('verifies RLS policies exist', async () => {
    await client.query(upSql);
    const result = await client.query(
      `SELECT polname FROM pg_policy WHERE polrelid IN ('tracks'::regclass, 'source_declarations'::regclass)`
    );
    const policies = result.rows.map((r: { polname: string }) => r.polname);
    expect(policies).toContain('tenant_isolation');
    expect(policies.length).toBe(2); // one per table
  }, TEST_TIMEOUT);

  it('applies down migration successfully', async () => {
    await client.query(upSql);
    await client.query(downSql);
    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    );
    const tracksExists = tables.rows.some((r: { tablename: string }) => r.tablename === 'tracks');
    const sourceDeclExists = tables.rows.some((r: { tablename: string }) => r.tablename === 'source_declarations');
    expect(tracksExists).toBe(false);
    expect(sourceDeclExists).toBe(false);
  }, TEST_TIMEOUT);
});