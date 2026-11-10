import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_TIMEOUT = 180_000;

describe('Migration 001_core', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;
  let upSql: string;
  let downSql: string;

  beforeAll(async () => {
    const fileContent = readFileSync(join(__dirname, '../migrations/001_core.sql'), 'utf-8');
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
  }, TEST_TIMEOUT);

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
    expect(tableNames).toContain('features');
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('tier_grants');
    expect(tableNames).toContain('admin_audit');
    expect(tableNames).toContain('admin_audit_2026_01');
    expect(tableNames).toContain('admin_audit_2026_02');
    expect(tableNames).toContain('admin_audit_2026_03');
    expect(tableNames).toContain('outbox');
  }, TEST_TIMEOUT);

  it('rejects bpm=59.9 (below 60.0)', async () => {
    await expect(
      client.query(
        `INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json)
         VALUES (gen_random_uuid(), 'otomix', gen_random_uuid(), '1.2.0', 59.9, '1A', 0.5, 3, 0.5, 'straight', '{}')`
      )
    ).rejects.toThrow(/check constraint/i);
  }, TEST_TIMEOUT);

  it('rejects camelot_key=13A (invalid format)', async () => {
    await expect(
      client.query(
        `INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json)
         VALUES (gen_random_uuid(), 'otomix', gen_random_uuid(), '1.2.0', 120, '13A', 0.5, 3, 0.5, 'straight', '{}')`
      )
    ).rejects.toThrow(/check constraint/i);
  }, TEST_TIMEOUT);

  it('rejects tenant_id=x (must be otomix or otodj)', async () => {
    await expect(
      client.query(
        `INSERT INTO features (feature_id, tenant_id, track_id, schema_version, bpm, camelot_key, energy_scalar, energy_stars, mixability, groove_mode, registry_json)
         VALUES (gen_random_uuid(), 'x', gen_random_uuid(), '1.2.0', 120, '1A', 0.5, 3, 0.5, 'straight', '{}')`
      )
    ).rejects.toThrow(/check constraint/i);
  }, TEST_TIMEOUT);

  it('verifies CHECK constraints via information_schema', async () => {
    const result = await client.query(
      `SELECT cc.check_clause
       FROM information_schema.check_constraints cc
       JOIN information_schema.constraint_column_usage ccu
         ON cc.constraint_name = ccu.constraint_name
       WHERE ccu.table_name = 'features'`
    );
    const clauses = result.rows.map((r: { check_clause: string }) => r.check_clause).join(' ');
    expect(clauses).toMatch(/bpm/i);
    expect(clauses).toMatch(/camelot_key/i);
    expect(clauses).toMatch(/tenant_id/i);
  }, TEST_TIMEOUT);

  it('verifies admin_audit partitions via pg_inherits', async () => {
    const result = await client.query(
      `SELECT inhrelid::regclass::text AS partition
       FROM pg_inherits
       WHERE inhparent = 'admin_audit'::regclass
       ORDER BY partition`
    );
    const partitions = result.rows.map((r: { partition: string }) => r.partition);
    expect(partitions).toContain('admin_audit_2026_01');
    expect(partitions).toContain('admin_audit_2026_02');
    expect(partitions).toContain('admin_audit_2026_03');
  }, TEST_TIMEOUT);

  it('applies down migration successfully', async () => {
    await client.query(downSql);
    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    );
    const featureExists = tables.rows.some((r: { tablename: string }) => r.tablename === 'features');
    expect(featureExists).toBe(false);
  }, TEST_TIMEOUT);
});
