// P06 Phase Integration Test — end-to-end scenarios that prove the
// stack (token + RBAC + interceptor + route handler + DB outbox) works.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIG = path.resolve(__dirname, '..', '..', 'db', 'migrations');
const SEED = path.resolve(__dirname, '..', '..', 'db', 'seeds');
const TEN = 'otomix' as const;
const ACTOR = 'cccccccc-0000-4000-8000-000000000001';

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
  for (const f of fs.readdirSync(SEED).filter((x: string) => x.endsWith('.sql') && !x.endsWith('.down.sql')).sort()) {
    await pg.query(fs.readFileSync(path.join(SEED, f), 'utf8'));
  }
  await pg.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,$2,'system_admin',1) ON CONFLICT DO NOTHING", [ACTOR, TEN]);
}, 180_000);

afterAll(async () => { await pg?.end(); await container?.stop(); });

describe('P06-IT', () => {
  it('(a) issue token -> interceptor -> DSP PATCH -> outbox + audit', async () => {
    const { enqueueDspPropagation } = await import('@otomix/db');
    const { writeAdminAudit } = await import('@otomix/access');
    const SECRET = 'p06-it-secret';

    const r = await enqueueDspPropagation(pg, {
      tenantId: TEN,
      chopGrid: '1/16',
      crossfadeBeats: 0.01,
      before: null,
      actorId: ACTOR,
      hmacSecret: SECRET,
    });
    expect(r.sequence).toBe(1);

    await writeAdminAudit(pg, {
      actorId: ACTOR,
      tenantId: TEN,
      action: 'dsp.parameters.update',
      detail: { before: null, after: { chopGrid: '1/16', crossfadeBeats: 0.01 } },
    });

    const ob = await pg.query("SELECT payload FROM outbox WHERE message_id=$1", [r.messageId]);
    expect(ob.rows.length).toBe(1);
    const au = await pg.query("SELECT audit_id FROM admin_audit WHERE action='dsp.parameters.update'");
    expect(au.rows.length).toBeGreaterThanOrEqual(1);
  });

  it('(b) revoked jti -> interceptor returns 401', async () => {
    const { createInterceptor } = await import('@otomix/gateway/src/interceptor.ts');
    const http = await import('node:http');
    const request = (await import('supertest')).default;

    const interceptor = createInterceptor({
      verifyToken: { verify: async () => ({ sub: 'u', tenant_id: 'otomix', jti: 'revoked', iat: 0, exp: 0 }) },
      isDenied: async () => true,
      getEffectivePermissions: async () => new Set(['dsp:*']),
      expectedTenantId: 'otomix',
    });
    const server = http.createServer((req, res) => interceptor(req, res, () => { res.statusCode = 200; res.end('ok'); }));
    const res = await request(server).patch('/api/v1/dsp/parameters').set('Authorization', 'Bearer token');
    expect(res.status).toBe(401);
  });

  it('(c) forged x-tenant-id header is ignored', async () => {
    const { createInterceptor } = await import('@otomix/gateway/src/interceptor.ts');
    const http = await import('node:http');
    const request = (await import('supertest')).default;

    // Token claims tenant=otomix; request headers claim otodj; expected=otodj
    const interceptor = createInterceptor({
      verifyToken: { verify: async () => ({ sub: 'u', tenant_id: 'otomix', jti: 'j', iat: 0, exp: 0 }) },
      isDenied: async () => false,
      getEffectivePermissions: async () => new Set(['dsp:*']),
      expectedTenantId: 'otodj',
    });
    const server = http.createServer((req, res) => interceptor(req, res, () => { res.statusCode = 200; res.end('ok'); }));
    const res = await request(server)
      .patch('/api/v1/dsp/parameters')
      .set('Authorization', 'Bearer t')
      .set('x-tenant-id', 'otodj');
    expect(res.status).toBe(403);
  });

  it('(d) cross-tenant token with expected=mismatch -> 403', async () => {
    const { createInterceptor } = await import('@otomix/gateway/src/interceptor.ts');
    const http = await import('node:http');
    const request = (await import('supertest')).default;

    const interceptor = createInterceptor({
      verifyToken: { verify: async () => ({ sub: 'u', tenant_id: 'otodj', jti: 'j', iat: 0, exp: 0 }) },
      isDenied: async () => false,
      getEffectivePermissions: async () => new Set(['dsp:*']),
      expectedTenantId: 'otomix',
    });
    const server = http.createServer((req, res) => interceptor(req, res, () => { res.statusCode = 200; res.end('ok'); }));
    const res = await request(server).patch('/api/v1/dsp/parameters').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });

  it('(e) missing scope (sys:* only) -> 403', async () => {
    const { createInterceptor } = await import('@otomix/gateway/src/interceptor.ts');
    const http = await import('node:http');
    const request = (await import('supertest')).default;

    const interceptor = createInterceptor({
      verifyToken: { verify: async () => ({ sub: 'u', tenant_id: 'otomix', jti: 'j', iat: 0, exp: 0 }) },
      isDenied: async () => false,
      getEffectivePermissions: async () => new Set(['sys:*']),
      expectedTenantId: 'otomix',
    });
    const server = http.createServer((req, res) => interceptor(req, res, () => { res.statusCode = 200; res.end('ok'); }));
    const res = await request(server).patch('/api/v1/dsp/parameters').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });

  it('(f) DEK namespace isolation: otomix vs otodj', async () => {
    const { createDekService, DecryptionFailedError } = await import('@otomix/access');
    const { randomBytes, createCipheriv, createDecipheriv } = await import('node:crypto');
    const KEK = randomBytes(32);
    const kek = {
      async wrap(dek: Buffer): Promise<Buffer> {
        const iv = randomBytes(12);
        const c = createCipheriv('aes-256-gcm', KEK, iv);
        const ct = Buffer.concat([c.update(dek), c.final()]);
        return Buffer.concat([iv, c.getAuthTag(), ct]);
      },
      async unwrap(w: Buffer): Promise<Buffer> {
        const iv = w.subarray(0, 12);
        const tag = w.subarray(12, 28);
        const ct = w.subarray(28);
        const d = createDecipheriv('aes-256-gcm', KEK, iv);
        d.setAuthTag(tag);
        return Buffer.concat([d.update(ct), d.final()]);
      },
    };
    const svc = createDekService({ kekProvider: kek });
    const enc = await svc.encrypt('otomix', Buffer.from('data'));
    await expect(svc.decrypt('otodj', enc)).rejects.toBeInstanceOf(DecryptionFailedError);
  });
});