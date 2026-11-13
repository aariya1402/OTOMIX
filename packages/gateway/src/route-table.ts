import { ROUTE_SCOPES } from './scopes.js';
import type { RouteScopeEntry } from './scopes.js';

export function matchRoutePath(routePath: string, reqPath: string): boolean {
  const routeSegs = routePath.split('/');
  const reqSegs = reqPath.split('/');
  if (routeSegs.length !== reqSegs.length) return false;
  for (let i = 0; i < routeSegs.length; i++) {
    const rs = routeSegs[i] ?? '';
    const qs = reqSegs[i] ?? '';
    if (rs.startsWith('{') && rs.endsWith('}')) {
      if (qs.length === 0) return false;
      continue;
    }
    if (rs !== qs) return false;
  }
  return true;
}

export function findRouteScope(method: string, pathname: string): RouteScopeEntry | null {
  for (const entry of ROUTE_SCOPES) {
    if (entry.method !== method) continue;
    if (matchRoutePath(entry.path, pathname)) return entry;
  }
  return null;
}

export function isMountedRoute(method: string, pathname: string): boolean {
  return findRouteScope(method, pathname) !== null;
}