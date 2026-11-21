import { describe, it, expect, vi } from 'vitest';
import { createTransitionPlanClient, TransitionPlanResponse } from '../src/mixplan/client';

describe('mixplan.client', () => {
  it('creates a plan request for adjacent tracks', async () => {
    const client = createTransitionPlanClient();
    const res = await client.planForAdjacentTracks('a', 'b');
    expect(res.ok).toBe(true);
    expect(res.request?.fromTrackId).toBe('a');
    expect(res.request?.toTrackId).toBe('b');
  });

  it('does not throw when submit fails', async () => {
    const client = createTransitionPlanClient({
      submit: async () => { throw new Error('boom'); },
      maxFallbackRungs: 1,
    });
    const res = await client.planForAdjacentTracks('a', 'b');
    expect(res.ok).toBe(false);
  });

  it('returns ok when submit succeeds with RUNG_NONE', async () => {
    const mockResponse: TransitionPlanResponse = {
      rung: 'RUNG_NONE',
      reason: '',
      tInSeconds: 100,
      tOutSeconds: 200,
      inBeatIndex: 1,
      outBeatIndex: 1,
      alignToSeconds: 200,
      mappedBpm: 120,
      windowBeats: 64,
    };
    const client = createTransitionPlanClient({
      submit: async () => mockResponse,
    });
    const res = await client.planForAdjacentTracks('a', 'b');
    expect(res.ok).toBe(true);
    expect(res.fallback).toBeUndefined();
    expect(res.notice).toBeUndefined();
  });

  it('handles RUNG_FOUR_BAR_CROSSFADE fallback with notice', async () => {
    const fallbackNotice = 'Fallback rung RUNG_FOUR_BAR_CROSSFADE used: Safety net: grid-independent 4-bar crossfade';
    let fallbackCalled = false;
    let receivedRung = '';
    let receivedNotice = '';

    const fallbackResponse: TransitionPlanResponse = {
      rung: 'RUNG_FOUR_BAR_CROSSFADE',
      reason: 'Safety net: grid-independent 4-bar crossfade',
      tInSeconds: 100,
      tOutSeconds: 200,
      inBeatIndex: 1,
      outBeatIndex: 1,
      alignToSeconds: 200,
      mappedBpm: 120,
      windowBeats: 64,
    };

    const client = createTransitionPlanClient({
      submit: async () => fallbackResponse,
      onFallback: (rung, notice) => {
        fallbackCalled = true;
        receivedRung = rung;
        receivedNotice = notice;
      },
      maxFallbackRungs: 3,
    });

    const res = await client.planForAdjacentTracks('a', 'b');
    expect(res.ok).toBe(true);
    expect(res.fallback).toBe(true);
    expect(res.notice).toBe('Fallback rung RUNG_FOUR_BAR_CROSSFADE used: Safety net: grid-independent 4-bar crossfade');
    expect(res.response?.rung).toBe('RUNG_FOUR_BAR_CROSSFADE');
    expect(fallbackCalled).toBe(true);
    expect(receivedRung).toBe('RUNG_FOUR_BAR_CROSSFADE');
    expect(receivedNotice).toBe(fallbackNotice);
  });

  it('continues to next rung when fallback rung is returned', async () => {
    const responses: TransitionPlanResponse[] = [
      { rung: 'RUNG_FOUR_BAR_CROSSFADE', reason: 'fallback 1', tInSeconds: 100, tOutSeconds: 200, inBeatIndex: 1, outBeatIndex: 1, alignToSeconds: 200, mappedBpm: 120, windowBeats: 64 },
      { rung: 'RUNG_NONE', reason: '', tInSeconds: 100, tOutSeconds: 200, inBeatIndex: 1, outBeatIndex: 1, alignToSeconds: 200, mappedBpm: 120, windowBeats: 64 },
    ];
    let callCount = 0;

    const client = createTransitionPlanClient({
      submit: async () => responses[callCount++],
      maxFallbackRungs: 3,
    });

    const res = await client.planForAdjacentTracks('a', 'b');
    expect(res.ok).toBe(true);
    expect(res.fallback).toBeUndefined(); // Second call succeeded with RUNG_NONE
    expect(res.response?.rung).toBe('RUNG_NONE');
    expect(callCount).toBe(2);
  });

  it('exhausts all fallback rungs and returns failure', async () => {
    const fallbackResponse: TransitionPlanResponse = {
      rung: 'RUNG_FOUR_BAR_CROSSFADE',
      reason: 'Safety net: grid-independent 4-bar crossfade',
      tInSeconds: 100,
      tOutSeconds: 200,
      inBeatIndex: 1,
      outBeatIndex: 1,
      alignToSeconds: 200,
      mappedBpm: 120,
      windowBeats: 64,
    };

    const client = createTransitionPlanClient({
      submit: async () => fallbackResponse,
      maxFallbackRungs: 2,
    });

    const res = await client.planForAdjacentTracks('a', 'b');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('all-fallback-rungs-exhausted');
  });

  it('handles exceptions and returns error', async () => {
    const client = createTransitionPlanClient({
      submit: async () => { throw new Error('network error'); },
      maxFallbackRungs: 1,
    });
    const res = await client.planForAdjacentTracks('a', 'b');
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('network error');
  });
});