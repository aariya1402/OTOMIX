// OTOMIX §7.1; GAP-015
import { Given, When, Then } from '@cucumber/cucumber';
import http from 'node:http';
import request from 'supertest';
import { createInterceptor } from '../../packages/gateway/src/interceptor.ts';
import type { InterceptorDeps, TokenClaims } from '../../packages/gateway/src/interceptor.ts';

Given('a user with permissions {string}', function (this: any, csv: string) {
  this.currentPermissions = csv.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
});

Given('a user with no permissions', function (this: any) {
  this.currentPermissions = [];
});

When('I send {string} to {string}', async function (this: any, method: string, path: string) {
  const claims: TokenClaims = {
    sub: 'authz-sub',
    tenant_id: 'otomix',
    jti: 'authz-jti',
    iat: 0,
    exp: 0,
  };
  const perms = new Set<string>(this.currentPermissions);
  const deps: InterceptorDeps = {
    verifyToken: { verify: async function () { return claims; } },
    isDenied: async function () { return false; },
    getEffectivePermissions: async function () { return perms; },
    expectedTenantId: 'otomix',
  };
  const interceptor = createInterceptor(deps);
  const server = http.createServer(function (req, res) {
    interceptor(req, res, function () { res.statusCode = 200; res.end('ok'); });
  });
  const client = request(server) as any;
  const res = await client[method.toLowerCase()](path).set('Authorization', 'Bearer token-x');
  this.responseStatus = res.status;
});

Then('the response status should be {int}', function (this: any, expected: number) {
  if (this.responseStatus !== expected) {
    throw new Error('expected ' + expected + ' got ' + this.responseStatus + ' for ' + this.method + ' ' + this.path);
  }
});