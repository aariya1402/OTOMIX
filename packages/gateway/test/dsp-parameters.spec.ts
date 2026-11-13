import { describe, it, expect } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createDspParametersHandler } from '../src/routes/dsp-parameters.ts';
import { createInMemoryDspParametersStore } from '../src/store/dsp-parameters-store.ts';

function makeServer() {
  const store = createInMemoryDspParametersStore();
  const handler = createDspParametersHandler({ store });
  const server = http.createServer((req, res) => {
    (req as any).claims = { sub: 'stub-user', tenant_id: 'otomix', jti: 'stub', iat: 0, exp: 0 };
    handler(req, res, (err) => {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'INTERNAL', message: String(err) }));
    });
  });
  return { server, store };
}

describe('PATCH /api/v1/dsp/parameters (P06-T07-S01-M01)', () => {
  it('(1) valid 1/16, 0.01 -> 200', async () => {
    const { server } = makeServer();
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/16', crossfadeBeats: 0.01 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.params.chopGrid).toBe('1/16');
  });

  it('(2) valid 1/8, 0.03125 (max) -> 200', async () => {
    const { server } = makeServer();
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/8', crossfadeBeats: 0.03125 });
    expect(res.status).toBe(200);
  });

  it('(3) valid 1/32, 0.0078125 (max) -> 200', async () => {
    const { server } = makeServer();
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/32', crossfadeBeats: 0.0078125 });
    expect(res.status).toBe(200);
  });

  it('(4) invalid chopGrid 1/64 -> 400', async () => {
    const { server } = makeServer();
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/64', crossfadeBeats: 0.01 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ARGUMENT');
  });

  it('(5) non-numeric crossfadeBeats "abc" -> 400', async () => {
    const { server } = makeServer();
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/16', crossfadeBeats: 'abc' });
    expect(res.status).toBe(400);
  });

  it('(6) negative crossfadeBeats -0.01 -> 400', async () => {
    const { server } = makeServer();
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/16', crossfadeBeats: -0.01 });
    expect(res.status).toBe(400);
  });

  it('(7) crossfadeBeats 0.02 exceeds 1/16 bound (0.015625) -> 400', async () => {
    const { server } = makeServer();
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/16', crossfadeBeats: 0.02 });
    expect(res.status).toBe(400);
  });

  it('(8) persistence round-trip: stored value matches', async () => {
    const { server, store } = makeServer();
    await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/32', crossfadeBeats: 0.0078125 });
    const got = await store.get();
    expect(got).toEqual({ chopGrid: '1/32', crossfadeBeats: 0.0078125 });
  });
});