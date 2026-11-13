import type { IncomingMessage, ServerResponse } from 'node:http';
import { findRouteScope, matchRoutePath } from './route-table.ts';
import { mapStatus } from './status-map.ts';

export { matchRoutePath };

export interface TokenClaims {
  sub: string;
  tenant_id: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface TokenVerifier {
  verify(token: string): Promise<TokenClaims>;
}

export interface InterceptorDeps {
  verifyToken: TokenVerifier;
  isDenied: (jti: string) => Promise<boolean>;
  getEffectivePermissions: (userId: string, tenantId: string) => Promise<Set<string>>;
  expectedTenantId: string;
}

export type InterceptResult =
  | { ok: true; claims: TokenClaims }
  | { ok: false; code: 'UNAUTHENTICATED' | 'PERMISSION_DENIED'; message: string };

export async function verifyRequest(req: IncomingMessage, deps: InterceptorDeps): Promise<InterceptResult> {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return { ok: false, code: 'UNAUTHENTICATED', message: 'Missing or invalid bearer token' };
  }
  const token = auth.slice('Bearer '.length).trim();
  if (token.length === 0) {
    return { ok: false, code: 'UNAUTHENTICATED', message: 'Missing or invalid bearer token' };
  }
  let claims: TokenClaims;
  try {
    claims = await deps.verifyToken.verify(token);
  } catch {
    return { ok: false, code: 'UNAUTHENTICATED', message: 'Invalid or expired token' };
  }
  const denied = await deps.isDenied(claims.jti);
  if (denied) {
    return { ok: false, code: 'UNAUTHENTICATED', message: 'Token has been revoked' };
  }
  if (claims.tenant_id !== deps.expectedTenantId) {
    return { ok: false, code: 'PERMISSION_DENIED', message: 'Tenant mismatch' };
  }
  const url = req.url ?? '/';
  const qIndex = url.indexOf('?');
  const pathname = qIndex >= 0 ? url.slice(0, qIndex) : url;
  const method = req.method ?? 'GET';
  const route = findRouteScope(method, pathname);
  if (route !== null) {
    const perms = await deps.getEffectivePermissions(claims.sub, claims.tenant_id);
    const granted = route.scopes.some((required) => perms.has(required));
    if (!granted) {
      return { ok: false, code: 'PERMISSION_DENIED', message: 'Insufficient permission: ' + route.scopes.join(' or ') + ' required' };
    }
  }
  return { ok: true, claims };
}

export function createInterceptor(deps: InterceptorDeps) {
  return async function interceptor(req: IncomingMessage, res: ServerResponse, next: (err?: Error) => void): Promise<void> {
    const result = await verifyRequest(req, deps);
    if (result.ok) { next(); return; }
    const status = mapStatus(result.code);
    const body = JSON.stringify({ error: result.code, message: result.message });
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(body);
  };
}