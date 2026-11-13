// OTOMIX §7.1; §6.5
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { sendEscalationWebhook } from '../src/escalation-webhook';

interface Captured {
  method: string;
  url: string;
  body: string;
}

let server: http.Server;
let baseUrl: string;
let responseQueue: number[] = [];
let captured: Captured[] = [];

beforeAll(async () => {
  server = http.createServer(function (req, res) {
    let body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () {
      captured.push({ method: req.method ?? '', url: req.url ?? '', body: body });
      const status = responseQueue.shift() ?? 200;
      res.statusCode = status;
      res.setHeader('content-type', 'text/plain');
      res.end('response-' + status);
    });
  });
  await new Promise<void>(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
  const addr = server.address() as AddressInfo;
  baseUrl = 'http://127.0.0.1:' + addr.port + '/hook';
}, 10000);

afterAll(async () => {
  await new Promise<void>(function (resolve) { server.close(function () { resolve(); }); });
});

describe('sendEscalationWebhook (P06-T02-S02-M01)', () => {
  it('sends one POST with actor, scope, tenant, timestamp on emergency scope grant', async () => {
    captured = [];
    responseQueue = [200];
    await sendEscalationWebhook(
      { actor: 'admin-1', scope: 'dsp:*', tenant: 'otomix', timestamp: '2026-11-13T10:00:00.000Z' },
      { url: baseUrl, baseDelayMillis: 1, capDelayMillis: 5 },
    );
    expect(captured.length).toBe(1);
    const req = captured[0];
    expect(req.method).toBe('POST');
    const parsed = JSON.parse(req.body);
    expect(parsed.actor).toBe('admin-1');
    expect(parsed.scope).toBe('dsp:*');
    expect(parsed.tenant).toBe('otomix');
    expect(parsed.timestamp).toBe('2026-11-13T10:00:00.000Z');
  });

  it('retries on 5xx and succeeds on 3rd attempt (3 total requests)', async () => {
    captured = [];
    responseQueue = [500, 500, 200];
    await sendEscalationWebhook(
      { actor: 'a', scope: 'dsp:*', tenant: 'otomix', timestamp: '2026-11-13T10:00:00.000Z' },
      { url: baseUrl, baseDelayMillis: 1, capDelayMillis: 5 },
    );
    expect(captured.length).toBe(3);
  });

  it('throws after 3 retries (4 total attempts) on persistent 5xx', async () => {
    captured = [];
    responseQueue = [500, 500, 500, 500, 500];
    await expect(
      sendEscalationWebhook(
        { actor: 'a', scope: 'dsp:*', tenant: 'otomix', timestamp: '2026-11-13T10:00:00.000Z' },
        { url: baseUrl, baseDelayMillis: 1, capDelayMillis: 5 },
      ),
    ).rejects.toThrow(/server error 500/);
    expect(captured.length).toBe(4);
  });

  it('does not retry on 4xx (1 request, throws immediately)', async () => {
    captured = [];
    responseQueue = [400, 200, 200];
    await expect(
      sendEscalationWebhook(
        { actor: 'a', scope: 'dsp:*', tenant: 'otomix', timestamp: '2026-11-13T10:00:00.000Z' },
        { url: baseUrl, baseDelayMillis: 1, capDelayMillis: 5 },
      ),
    ).rejects.toThrow(/client error 400/);
    expect(captured.length).toBe(1);
  });
});