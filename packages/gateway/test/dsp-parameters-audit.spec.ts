import { describe, it, expect } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { createDspParametersHandler } from '../src/routes/dsp-parameters.ts';
import { createInMemoryDspParametersStore } from '../src/store/dsp-parameters-store.ts';

function makeServer(opts?: { audit?: (p: any) => Promise<void>; initial?: any }) {
  const store = createInMemoryDspParametersStore(opts?.initial ?? null);
  const handler = createDspParametersHandler({ store, audit: opts?.audit });
  const server = http.createServer((req, res) => {
    (req as any).claims = { sub: 'actor-1', tenant_id: 'otomix', jti: 'j', iat: 0, exp: 0 };
    handler(req, res, (err) => {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'INTERNAL', message: String(err) }));
    });
  });
  return { server, store };
}

describe('DSP parameters + audit wiring (P06-T07-S01-M02)', () => {
  it('calls audit with actor/tenant/action and before+after on success', async () => {
    const calls: any[] = [];
    const { server } = makeServer({
      audit: async (p) => { calls.push(p); },
      initial: { chopGrid: '1/32', crossfadeBeats: 0.005 },
    });
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/16', crossfadeBeats: 0.01 });
    expect(res.status).toBe(200);
    expect(calls.length).toBe(1);
    expect(calls[0].actorId).toBe('actor-1');
    expect(calls[0].tenantId).toBe('otomix');
    expect(calls[0].action).toBe('dsp.parameters.update');
    expect(calls[0].detail.before).toEqual({ chopGrid: '1/32', crossfadeBeats: 0.005 });
    expect(calls[0].detail.after).toEqual({ chopGrid: '1/16', crossfadeBeats: 0.01 });
  });

  it('does not call audit on validation failure', async () => {
    const calls: any[] = [];
    const { server } = makeServer({ audit: async (p) => { calls.push(p); } });
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/64', crossfadeBeats: 0.01 });
    expect(res.status).toBe(400);
    expect(calls.length).toBe(0);
  });

  it('works without audit dep (M01 backward compatibility)', async () => {
    const { server } = makeServer();
    const res = await request(server).patch('/api/v1/dsp/parameters').send({ chopGrid: '1/16', crossfadeBeats: 0.01 });
    expect(res.status).toBe(200);
  });
});