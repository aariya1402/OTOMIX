import { describe, expect, it } from 'vitest';
import { createMixPlanAdapter } from '../src/routes/mixplan-adapter.js';
import type { FeatureRow } from '../src/repository/features-repository.js';

function feature(trackId: string, bpm: number, registryJson: object): FeatureRow {
  return {
    feature_id: `${trackId}-feature`,
    tenant_id: 'otomix',
    track_id: trackId,
    schema_version: '1.2.0',
    bpm,
    camelot_key: '1A',
    energy_scalar: 0.5,
    energy_stars: 3,
    mixability: 0.5,
    groove_mode: 'straight',
    registry_json: registryJson,
    analyzed_at: '2026-11-27T00:00:00Z',
  };
}

describe('createMixPlanAdapter', () => {
  it('builds beat-grid inputs and the P08 anchor response', async () => {
    const adapter = createMixPlanAdapter({
      featuresRepo: {
        findAll: async () => [
          feature('incoming', 124, { grid: { t0_seconds: 1.25 } }),
          feature('outgoing', 120, { grid: { t0_seconds: 2.5 } }),
        ],
      },
      trackRepo: {
        findByTrackId: async (_tenantId, trackId) => ({
          track_id: trackId,
          duration_ms: trackId === 'incoming' ? 180_000 : 200_000,
        }),
      },
    });

    const response = await adapter({
      tenant_id: 'otomix',
      outgoing_track_id: 'outgoing',
      incoming_track_id: 'incoming',
      bpm_out: 120,
      bpm_in: 124,
      bpm_target: 122,
      window_beats: 16,
      crossfade_ms: 5,
      chop_grid: 1,
      idempotency_key: '123e4567-e89b-42d3-a456-426614174000',
    });

    expect(response.anchors).toEqual([
      { beat_index: 337, t0_seconds: 170.5, drift_seconds: 0 },
      { beat_index: 1, t0_seconds: 1.25, drift_seconds: 0 },
    ]);
    expect(response.fallback).toEqual({
      rung: 0,
      reason: 'kick_status_unknown',
    });
  });

  it('returns missing_t0 ahead of kick_status_unknown', async () => {
    const adapter = createMixPlanAdapter({
      featuresRepo: {
        findAll: async () => [
          feature('incoming', 124, {}),
          feature('outgoing', 120, { grid: {} }),
        ],
      },
      trackRepo: {
        findByTrackId: async (_tenantId, trackId) => ({
          track_id: trackId,
          duration_ms: 200_000,
        }),
      },
    });

    const response = await adapter({
      tenant_id: 'otomix',
      outgoing_track_id: 'outgoing',
      incoming_track_id: 'incoming',
      bpm_out: 120,
      bpm_in: 124,
      bpm_target: 122,
      window_beats: 16,
      crossfade_ms: 5,
      chop_grid: 1,
      idempotency_key: '123e4567-e89b-42d3-a456-426614174001',
    });

    expect(response.anchors[0]).toEqual({
      beat_index: 337,
      t0_seconds: 168,
      drift_seconds: 0,
    });
    expect(response.anchors[1].t0_seconds).toBe(0);
    expect(response.fallback?.reason).toBe('missing_t0');
  });

  it('rejects cross-tenant or missing track data', async () => {
    const adapter = createMixPlanAdapter({
      featuresRepo: {
        findAll: async () => [],
      },
      trackRepo: {
        findByTrackId: async () => null,
      },
    });

    await expect(
      adapter({
        tenant_id: 'otodj',
        outgoing_track_id: 'outgoing',
        incoming_track_id: 'incoming',
        bpm_out: 120,
        bpm_in: 124,
        bpm_target: 122,
        window_beats: 16,
        crossfade_ms: 5,
        chop_grid: 1,
        idempotency_key: '123e4567-e89b-42d3-a456-426614174002',
      }),
    ).rejects.toThrow('Track or track feature not found');
  });

  it('uses kick_status_unknown when kick status is unknown', async () => {
    const adapter = createMixPlanAdapter({
      featuresRepo: {
        findAll: async () => [
          feature('incoming', 124, { grid: { t0_seconds: 1.25 } }),
          feature('outgoing', 120, { grid: { t0_seconds: 2.5 } }),
        ],
      },
      trackRepo: {
        findByTrackId: async (_tenantId, trackId) => ({
          track_id: trackId,
          duration_ms: 200_000,
        }),
      },
    });

    const response = await adapter({
      tenant_id: 'otomix',
      outgoing_track_id: 'outgoing',
      incoming_track_id: 'incoming',
      bpm_out: 120,
      bpm_in: 124,
      bpm_target: 122,
      window_beats: 16,
      crossfade_ms: 5,
      chop_grid: 1,
      idempotency_key: '123e4567-e89b-42d3-a456-426614174003',
    });

    expect(response.fallback).toEqual({
      rung: 0,
      reason: 'kick_status_unknown',
    });
  });
});
