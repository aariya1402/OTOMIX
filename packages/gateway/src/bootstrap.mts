import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { withTenant } from '@otomix/db';
import type { TenantId } from '@otomix/db';
import { createGatewayApp } from './index.js';
import { createInterceptor } from './interceptor.js';
import { createIdempotencyStore } from './idempotency/store.js';
import { FeaturesRepository } from './repository/features-repository.js';
import { TrackRepository } from './repository/track-repository.js';
import { createMixPlanAdapter } from './routes/mixplan-adapter.js';

export interface GatewayConfig {
  databaseUrl: string;
  redisUrl: string;
  jwksUrl: URL;
  tenantId: TenantId;
  port: number;
}

const REQUIRED_RLS_TABLES = [
  'features',
  'roles',
  'role_permissions',
  'user_roles',
  'user_permissions',
  'groups',
  'group_members',
  'group_permissions',
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readGatewayConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`${name} environment variable is required`);
    return value;
  };

  const tenantId = required('GATEWAY_TENANT_ID');
  if (tenantId !== 'otomix' && tenantId !== 'otodj') {
    throw new Error('GATEWAY_TENANT_ID must be otomix or otodj');
  }

  const jwksUrl = new URL(required('GATEWAY_JWKS_URL'));
  if (jwksUrl.protocol !== 'https:') {
    throw new Error('GATEWAY_JWKS_URL must use HTTPS');
  }

  const portRaw = env.PORT?.trim() || '8080';
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    databaseUrl: required('DATABASE_URL'),
    redisUrl: required('REDIS_URL'),
    jwksUrl,
    tenantId,
    port,
  };
}

async function assertDatabaseReady(pool: Pool): Promise<void> {
  const role = await pool.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
    'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user'
  );
  if (
    role.rowCount !== 1 ||
    role.rows[0]?.rolsuper !== false ||
    role.rows[0]?.rolbypassrls !== false
  ) {
    throw new Error('Gateway database role must not be a superuser or bypass row-level security');
  }

  const tables = await pool.query<{ relname: string }>(
    `SELECT relname
       FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relname = ANY($1::text[])
        AND relrowsecurity
        AND relforcerowsecurity`,
    [REQUIRED_RLS_TABLES]
  );
  const protectedTables = new Set(tables.rows.map(({ relname }) => relname));
  const missing = REQUIRED_RLS_TABLES.filter((table) => !protectedTables.has(table));
  if (missing.length > 0) {
    throw new Error(`Gateway requires FORCE ROW LEVEL SECURITY on: ${missing.join(', ')}`);
  }
}

async function getEffectivePermissions(
  pool: Pool,
  tenantId: TenantId,
  userId: string
): Promise<Set<string>> {
  if (!UUID_PATTERN.test(userId)) return new Set();
  return withTenant(pool, tenantId, async (client) => {
    const result = await client.query<{ permission_key: string }>(
      `WITH grants AS (
         SELECT rp.permission_key, 'allow'::text AS effect
           FROM user_roles ur
           JOIN roles r ON r.role_id = ur.role_id AND r.tenant_id = ur.tenant_id
           JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.tenant_id = ur.tenant_id
          WHERE ur.user_id = $1::uuid
            AND ur.tenant_id = $2
            AND ur.revoked_at IS NULL
            AND (ur.expires_at IS NULL OR ur.expires_at >= CURRENT_TIMESTAMP)
         UNION ALL
         SELECT permission_key, effect
           FROM user_permissions
          WHERE user_id = $1::uuid
            AND tenant_id = $2
            AND revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP)
         UNION ALL
         SELECT gp.permission_key, gp.effect
           FROM group_members gm
           JOIN groups g ON g.group_id = gm.group_id AND g.tenant_id = gm.tenant_id
           JOIN group_permissions gp ON gp.group_id = gm.group_id AND gp.tenant_id = gm.tenant_id
          WHERE gm.user_id = $1::uuid
            AND gm.tenant_id = $2
            AND gp.revoked_at IS NULL
            AND (gp.expires_at IS NULL OR gp.expires_at >= CURRENT_TIMESTAMP)
       )
       SELECT permission_key
         FROM grants
        GROUP BY permission_key
       HAVING bool_or(effect = 'allow') AND NOT bool_or(effect = 'deny')`,
      [userId, tenantId]
    );
    return new Set(result.rows.map(({ permission_key }) => permission_key));
  });
}

export async function startGateway(): Promise<() => Promise<void>> {
  const config = readGatewayConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const redis = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  let server: ReturnType<typeof createServer> | undefined;

  try {
    await Promise.all([pool.query('SELECT 1'), redis.connect()]);
    await assertDatabaseReady(pool);

    const jwks = createRemoteJWKSet(config.jwksUrl);
    const interceptor = createInterceptor({
      verifyToken: {
        async verify(token) {
          const { payload } = await jwtVerify(token, jwks, { algorithms: ['RS256'] });
          if (
            typeof payload.sub !== 'string' ||
            typeof payload.tenant_id !== 'string' ||
            typeof payload.jti !== 'string' ||
            typeof payload.iat !== 'number' ||
            typeof payload.exp !== 'number'
          ) {
            throw new Error('Invalid access token claims');
          }
          return {
            sub: payload.sub,
            tenant_id: payload.tenant_id,
            jti: payload.jti,
            iat: payload.iat,
            exp: payload.exp,
          };
        },
      },
      isDenied: async (jti) => (await redis.exists(`otomix:deny:jti:${jti}`)) === 1,
      getEffectivePermissions: (userId, tenantId) =>
        getEffectivePermissions(pool, tenantId as TenantId, userId),
      expectedTenantId: config.tenantId,
    });

    const featuresRepo = new FeaturesRepository(pool);
    const trackRepo = new TrackRepository(pool);
    const planAdapter = createMixPlanAdapter({ featuresRepo, trackRepo });
    const app = createGatewayApp({
      pool,
      interceptor,
      mixplan: {
        idempotencyStore: createIdempotencyStore(redis),
        planTransition: planAdapter,
      },
    });
    app.get('/health', async (_req, res) => {
      try {
        await Promise.all([pool.query('SELECT 1'), redis.ping()]);
        res.status(200).json({ status: 'ok' });
      } catch {
        res.status(503).json({ status: 'unavailable' });
      }
    });

    const listeningServer = createServer(app);
    server = listeningServer;
    await new Promise<void>((resolveListen, rejectListen) => {
      listeningServer.once('error', rejectListen);
      listeningServer.listen(config.port, '0.0.0.0', resolveListen);
    });
  } catch (error) {
    await Promise.allSettled([pool.end(), redis.quit()]);
    throw error;
  }

  if (!server) throw new Error('Gateway server did not start');
  const runningServer = server;
  return async () => {
    await new Promise<void>((resolveClose, rejectClose) => {
      runningServer.close((error) => (error ? rejectClose(error) : resolveClose()));
    });
    await Promise.all([pool.end(), redis.quit()]);
  };
}

const isEntrypoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isEntrypoint) {
  void startGateway()
    .then((close) => {
      const shutdown = () => {
        void close().catch((error: unknown) => {
          console.error('Gateway shutdown failed', error);
          process.exitCode = 1;
        });
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
      console.info('Gateway listening');
    })
    .catch((error: unknown) => {
      console.error('Gateway startup failed', error);
      process.exitCode = 1;
    });
}
