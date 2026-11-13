// OTOMIX §7.1; §7.11
import { Given, When, Then } from '@cucumber/cucumber';
import http from 'node:http';
import request from 'supertest';
import { createInterceptor } from '../../packages/gateway/src/interceptor.ts';
import type { TokenClaims } from '../../packages/gateway/src/interceptor.ts';;

const ROLE_SCOPES: Record<string, string[]> = {
  'Audio DSP Admin': ['dsp:*', 'audio:tuning', 'mastering:*'],
  'Content & Licensing Admin': ['catalog:*'],
  'System Admin': ['sys:*', 'users:*', 'billing:*'],
  'End User': ['user:read', 'local:process'],
};

Given('a token for role {string}', function (this: any, role: string) {
  this.role = role;
});

When('I send {string} to {string}', async function (this: any, method: string, path: string) {
  const scopes = ROLE_SCOPES[this.role] ?? [];
  const claims: TokenClaims = {
    sub: 'authz-sub',
    tenant_id: 'otomix',
    scopes,
    tier: 1,
    jti: 'authz-jti',
    iat: 0,
    exp: 0,
  };
  const interceptor = createInterceptor({
    verifyToken: { verify: async () => claims },
    isDenied: async () => false,
    expectedTenantId: 'otomix',
  });
  const server = http.createServer(function (req, res) {
    interceptor(req, res, function () {
      res.statusCode = 200;
      res.end('ok');
    });
  });
  const client = request(server) as any;
  const m = method.toLowerCase();
  const res = await client[m](path).set('Authorization', 'Bearer token-x');
  this.responseStatus = res.status;
});

Then('the response status should be {int}', function (this: any, expected: number) {
  if (this.responseStatus !== expected) {
    throw new Error('expected status ' + expected + ' but got ' + this.responseStatus + ' for ' + this.method + ' ' + this.path);
  }
});