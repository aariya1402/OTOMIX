import type { IncomingMessage, ServerResponse } from 'node:http';
import { ROUTE_SCOPES } from './scopes.ts';
import type { RouteScopeEntry } from './scopes.ts';
import { mapStatus } from './status-map.ts';

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

export function matchRoutePath(routePath: string, reqPath: string): boolean {
  const routeSegs = routePath.split('/');
  const reqSegs = reqPath.split('/');
  if (routeSegs.length !== reqSegs.length) return false;
  for (let i = 0; i < routeSegs.length; i++) {
    const rs = routeSegs[i];
    const qs = reqSegs[i];
    if (rs.startsWith('{') && rs.endsWith('}')) {
      if (qs.length === 0) return false;
      continue;
    }
    if (rs !== qs) return false;
  }
  return true;
}

function findRouteScope(method: string, pathname: string): RouteScopeEntry | null {
  for (const entry of ROUTE_SCOPES) {
    if (entry.method !== method) continue;
    if (matchRoutePath(entry.path, pathname)) return entry;
  }
  return null;
}

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