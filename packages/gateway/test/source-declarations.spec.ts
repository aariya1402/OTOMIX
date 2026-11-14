// OTOMIX 6.2 - Mother 1 - GAP-017; GAP-022
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordDeclaration } from '../src/declarations/record';
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

describe('recordDeclaration (P07-T05-S01-M01)', () => {
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

    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await client.query(loadUp('001_core.sql'));
    await client.query(loadUp('002_rls.sql'));
    await client.query(
      'INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1, $2, $3, $4);',
      [OWNER_ID, TENANT_ID, 'end_user', 1],
    );
    await client.query(loadUp('007_tracks_source_declarations.sql'));
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (client) await client.end();
    if (container) await container.stop();
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    await client.query('DELETE FROM source_declarations');
  });

  it('records ingest declaration with v1.0 terms and UTC timestamp', async () => {
    const declaredAt = new Date('2026-11-14T12:00:00.000Z');
    let declarationId = '';

    try {
      await client.query('BEGIN');
      await setTenantId(client, TENANT_ID);
      declarationId = await recordDeclaration(client, {
        tenantId: TENANT_ID,
        userId: OWNER_ID,
        scope: 'ingest',
        termsVersion: 'v1.0',
        declaredAt,
      });
      expect(typeof declarationId).toBe('string');
      expect(declarationId.length).toBeGreaterThan(0);

      const r = await client.query(
        'SELECT declaration_id, tenant_id, user_id, scope, terms_version, declared_at FROM source_declarations',
      );
      expect(r.rows.length).toBe(1);
      const row = r.rows[0];
      expect(row.tenant_id).toBe(TENANT_ID);
      expect(row.user_id).toBe(OWNER_ID);
      expect(row.scope).toBe('ingest');
      expect(row.terms_version).toBe('v1.0');
      expect(row.declared_at).toBeInstanceOf(Date);
      expect((row.declared_at as Date).toISOString()).toBe('2026-11-14T12:00:00.000Z');

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }, TEST_TIMEOUT);

  it('rejects invalid scope via CHECK constraint', async () => {
    try {
      await client.query('BEGIN');
      await setTenantId(client, TENANT_ID);
      await expect(
        recordDeclaration(client, {
          tenantId: TENANT_ID,
          userId: OWNER_ID,
          scope: 'not_a_scope' as unknown as 'ingest',
          termsVersion: 'v1.0',
          declaredAt: new Date(),
        }),
      ).rejects.toThrow(/check|constraint/i);
    } finally {
      await client.query('ROLLBACK');
    }
  }, TEST_TIMEOUT);

  it('records publish and export declarations with UTC timestamps', async () => {
    try {
      await client.query('BEGIN');
      await setTenantId(client, TENANT_ID);
      const publishAt = new Date('2026-11-14T13:00:00.000Z');
      const exportAt = new Date('2026-11-14T14:00:00.000Z');
      await recordDeclaration(client, {
        tenantId: TENANT_ID,
        userId: OWNER_ID,
        scope: 'publish',
        termsVersion: 'v1.0',
        declaredAt: publishAt,
      });
      await recordDeclaration(client, {
        tenantId: TENANT_ID,
        userId: OWNER_ID,
        scope: 'export',
        termsVersion: 'v1.0',
        declaredAt: exportAt,
      });
      const r = await client.query(
        'SELECT scope, declared_at FROM source_declarations ORDER BY scope',
      );
      expect(r.rows.map((row: any) => row.scope)).toEqual(['export', 'publish']);
      for (const row of r.rows) {
        expect((row.declared_at as Date).toISOString().endsWith('Z')).toBe(true);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }, TEST_TIMEOUT);
});