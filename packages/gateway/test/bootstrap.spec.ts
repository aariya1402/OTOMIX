import { describe, expect, it } from 'vitest';
import { readGatewayConfig } from '../src/bootstrap.mjs';

const validEnv = {
  DATABASE_URL: 'postgres://app_user:secret@db.example/app',
  REDIS_URL: 'redis://cache.example:6379',
  GATEWAY_JWKS_URL: 'https://identity.example/.well-known/jwks.json',
  GATEWAY_TENANT_ID: 'otomix',
  PORT: '8080',
};

describe('gateway production configuration', () => {
  it('accepts complete production settings', () => {
    const config = readGatewayConfig(validEnv);
    expect(config.port).toBe(8080);
    expect(config.tenantId).toBe('otomix');
    expect(config.jwksUrl.protocol).toBe('https:');
  });

  it('fails closed when required settings are missing or unsafe', () => {
    expect(() => readGatewayConfig({ ...validEnv, DATABASE_URL: '' })).toThrow(
      'DATABASE_URL environment variable is required'
    );
    expect(() => readGatewayConfig({ ...validEnv, GATEWAY_TENANT_ID: 'all' })).toThrow(
      'GATEWAY_TENANT_ID must be otomix or otodj'
    );
    expect(() =>
      readGatewayConfig({ ...validEnv, GATEWAY_JWKS_URL: 'http://identity.example/jwks' })
    ).toThrow('GATEWAY_JWKS_URL must use HTTPS');
    expect(() => readGatewayConfig({ ...validEnv, PORT: '70000' })).toThrow(
      'PORT must be an integer between 1 and 65535'
    );
  });
});
