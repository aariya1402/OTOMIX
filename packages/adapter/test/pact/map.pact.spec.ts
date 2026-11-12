// P05-T01-S02-M01 — Pact consumer contract + AJV mapping tests.
// Consumer: otomix-adapter · Provider: feature-registry-engine.

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { mapEngineToRegistry } from '../../src/map';

const { like, string } = MatchersV3;

const PACTS_DIR = path.resolve(__dirname, 'pacts');
const PACT_FILE = path.join(PACTS_DIR, 'otomix-adapter-feature-registry-engine.json');

const v124Fixture = {
  schema_version: '1.2.4',
  track_id: '550e8400-e29b-41d4-a716-446655440000',
  bpm: 120.0,
  key: '8A',
  grid: {
    bpm_seed: 120.0,
    t0_seconds: 0.0,
    delta_phi_seconds: 0.0,
    groove_mode: 'straight',
    groove_delta: 0.1,
    pre_kick_beats: 0,
  },
  energy: {
    rhythm: 0.5,
    dynamics: 0.5,
    loudness: 0.5,
    spectral: 0.5,
    scalar: 0.5,
    stars: 3,
  },
  mixability: {
    score: 0.7,
    e_kick: 0.8,
    c_bass: 0.6,
    s_tempo: 0.9,
    v_tune: 0.5,
    class: 'mixable',
  },
  vocal_map: {
    threshold: 0.65,
    smoothing_ms: 1000,
    frames: [
      { t: 0.0, p: 0.1, v: 0 },
      { t: 1.0, p: 0.9, v: 1 },
    ],
  },
};

const v200Fixture = { ...v124Fixture, schema_version: '2.0.0' };

const provider = new PactV3({
  consumer: 'otomix-adapter',
  provider: 'feature-registry-engine',
  dir: PACTS_DIR,
  logLevel: 'warn',
});

describe('P05-T01-S02-M01 — mapEngineToRegistry consumer contract', () => {
  it('maps a v1.2.4 engine output to a registry v1.2 payload', async () => {
    provider
      .given('a valid v1.2.4 engine output')
      .uponReceiving('a v1.2.4 engine output to map')
      .withRequest({
        method: 'POST',
        path: '/map',
        headers: { 'Content-Type': 'application/json' },
        body: v124Fixture,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like({ schema_version: string('1.2.4') }),
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(mockServer.url + '/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v124Fixture),
      });
      expect(res.status).toBe(200);
    });

    const result = mapEngineToRegistry(v124Fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema_version).toBe('1.2.4');
  }, 30000);

  it('flags a v2.0.0 engine output as PURGE_AND_REANALYZE', async () => {
    provider
      .given('a v2.0.0 engine output')
      .uponReceiving('a v2.0.0 engine output to map')
      .withRequest({
        method: 'POST',
        path: '/map',
        headers: { 'Content-Type': 'application/json' },
        body: v200Fixture,
      })
      .willRespondWith({
        status: 409,
        headers: { 'Content-Type': 'application/json' },
        body: like({ reason: string('PURGE_AND_REANALYZE') }),
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(mockServer.url + '/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v200Fixture),
      });
      expect(res.status).toBe(409);
    });

    const result = mapEngineToRegistry(v200Fixture);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('PURGE_AND_REANALYZE');
    if (result.reason === 'PURGE_AND_REANALYZE') {
      expect(result.from).toBe('2.0.0');
      expect(result.to).toBe('1.2.x');
    }
  }, 30000);

  it('generates the Pact contract file with expected consumer/provider/interactions', () => {
    expect(fs.existsSync(PACT_FILE)).toBe(true);
    const pact = JSON.parse(fs.readFileSync(PACT_FILE, 'utf8')) as {
      consumer: { name: string };
      provider: { name: string };
      interactions: Array<{
        description: string;
        request?: { method?: string; path?: string };
        response?: { status?: number };
      }>;
    };
    expect(pact.consumer.name).toBe('otomix-adapter');
    expect(pact.provider.name).toBe('feature-registry-engine');
    expect(Array.isArray(pact.interactions)).toBe(true);
    expect(pact.interactions.length).toBeGreaterThanOrEqual(2);
    for (const inter of pact.interactions) {
      expect(typeof inter.description).toBe('string');
      expect(inter.request?.method).toBe('POST');
      expect(inter.request?.path).toBe('/map');
      expect(typeof inter.response?.status).toBe('number');
    }
  }, 30000);
});