// OTOMIX §8.4 · Mother §9.1; Add. §7
import { describe, it, expect } from 'vitest';
import { PassThrough } from 'node:stream';
import { createLogger, LogRecord } from '../src/telemetry/logger';

function captureLog(
  record: LogRecord,
  options: { service?: string; tenantId?: string } = {},
): Record<string, unknown> {
  const stream = new PassThrough();
  const logger = createLogger({
    service: 'test',
    writable: stream,
    ...options,
  });
  const chunks: Buffer[] = [];
  stream.on('data', (c) => chunks.push(c as Buffer));
  logger.log(record);
  return JSON.parse(Buffer.concat(chunks).toString().trim());
}

describe('JSON Logger (P01-T08-S01-M01)', () => {
  it('masks IP/email, drops lat/long, rejects non-2-letter country', () => {
    const input: LogRecord = {
      level: 'info',
      service: 'gateway',
      tenant_id: 'otomix',
      trace_id: 'abc123',
      span_id: 'def456',
      event: 'ingestion.start',
      outcome: 'success',
      country: 'Germany',
      durationMs: 123,
      ip: '203.0.113.7',
      email: 'user@example.com',
      lat: 52.52,
      long: 13.405,
    };

    const output = captureLog(input);

    expect(output.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(output.level).toBe('info');
    expect(output.service).toBe('gateway');
    expect(output.tenant_id).toBe('otomix');
    expect(output.trace_id).toBe('abc123');
    expect(output.span_id).toBe('def456');
    expect(output.event).toBe('ingestion.start');
    expect(output.outcome).toBe('success');
    expect(output.durationMs).toBe(123);

    expect(output.ip).toBe('***.***.***.***');
    expect(output.email).toBe('***@***');
    expect(output.lat).toBeUndefined();
    expect(output.long).toBeUndefined();
    expect(output.latitude).toBeUndefined();
    expect(output.longitude).toBeUndefined();
    expect(output.country).toBeUndefined();

    const json = JSON.stringify(output);
    expect(json).not.toContain('203.0.113.7');
    expect(json).not.toContain('user@example.com');
    expect(json).not.toContain('Germany');
    expect(json).not.toContain('52.52');
    expect(json).not.toContain('13.405');
  });

  it('accepts a valid ISO 3166-1 Alpha-2 country code', () => {
    const input: LogRecord = {
      level: 'warn',
      service: 'worker',
      tenant_id: 'otomix',
      trace_id: 't1',
      span_id: 's1',
      event: 'analysis.complete',
      outcome: 'success',
      country: 'DE',
      durationMs: 456,
    };
    const output = captureLog(input);
    expect(output.country).toBe('DE');
  });

  it('rejects a lowercase country code', () => {
    const input: LogRecord = {
      level: 'info',
      service: 'test',
      tenant_id: 'otomix',
      trace_id: 't1',
      span_id: 's1',
      event: 'test',
      outcome: 'success',
      country: 'de',
      durationMs: 1,
    };
    const output = captureLog(input);
    expect(output.country).toBeUndefined();
  });

  it('throws on missing required fields', () => {
    const stream = new PassThrough();
    const logger = createLogger({ service: 'test', writable: stream });
    expect(() =>
      logger.log({
        level: 'info',
      } as LogRecord),
    ).toThrow('Logger: missing required field');
  });

  it('uses tenant_id default from factory options', () => {
    const input: LogRecord = {
      level: 'info',
      service: 'svc',
      trace_id: 't1',
      span_id: 's1',
      event: 'evt',
      outcome: 'success',
      country: 'US',
      durationMs: 10,
    };
    const stream = new PassThrough();
    const logger = createLogger({
      service: 'svc',
      tenantId: 'custom-tenant',
      writable: stream,
    });
    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(c as Buffer));
    logger.log(input);
    const output = JSON.parse(Buffer.concat(chunks).toString().trim());
    expect(output.tenant_id).toBe('custom-tenant');
  });

  it('allows per-call tenant_id override', () => {
    const input: LogRecord = {
      level: 'info',
      service: 'svc',
      tenant_id: 'override-tenant',
      trace_id: 't1',
      span_id: 's1',
      event: 'evt',
      outcome: 'success',
      country: 'US',
      durationMs: 10,
    };
    const output = captureLog(input, { tenantId: 'default-tenant' });
    expect(output.tenant_id).toBe('override-tenant');
  });
});