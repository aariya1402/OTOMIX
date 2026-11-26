import { describe, it, expect } from 'vitest';
import { createTransitionPlanClient } from '../src/mixplan/client';

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

  it('returns ok when submit succeeds', async () => {
    const client = createTransitionPlanClient({
      submit: async () => ({ accepted: true }),
    });
    const res = await client.planForAdjacentTracks('a', 'b');
    expect(res.ok).toBe(true);
  });

  it('submits the nearest vocal-safe transition window', async () => {
    let submittedWindow: unknown;
    const client = createTransitionPlanClient({
      submit: async (request) => {
        submittedWindow = request.transitionWindow;
      },
    });

    const res = await client.planForAdjacentTracks('a', 'b', {
      transitionWindow: { startBeat: 2, endBeat: 4 },
      vocalMap: [0, 0, 1, 1, 0, 0],
    });

    expect(res.ok).toBe(true);
    expect(submittedWindow).toEqual({ startBeat: 0, endBeat: 2 });
  });

  it('does not submit a plan when no vocal-safe window exists', async () => {
    let submitted = false;
    const client = createTransitionPlanClient({
      submit: async () => {
        submitted = true;
      },
    });

    const res = await client.planForAdjacentTracks('a', 'b', {
      transitionWindow: { startBeat: 0, endBeat: 2 },
      vocalMap: [1, 1, 1],
    });

    expect(res).toEqual({ ok: false, reason: 'vocal-gate-no-instrumental-window' });
    expect(submitted).toBe(false);
  });

  it('pairs only adjacent tracks in queue order', async () => {
    const submitted: Array<{ fromTrackId: string; toTrackId: string }> = [];
    const client = createTransitionPlanClient({
      submit: async (request) => {
        submitted.push({
          fromTrackId: request.fromTrackId,
          toTrackId: request.toTrackId,
        });
      },
    });

    const res = await client.planForAdjacentQueueTracks(['a', 'b', 'c']);

    expect(res.pairs).toEqual([
      ['a', 'b'],
      ['b', 'c'],
    ]);
    expect(submitted).toEqual([
      { fromTrackId: 'a', toTrackId: 'b' },
      { fromTrackId: 'b', toTrackId: 'c' },
    ]);
  });

  it('stores a server fallback and raises a non-fatal notice', async () => {
    const client = createTransitionPlanClient({
      submit: async () => ({
        fallback: {
          rung: 'RUNG_FOUR_BAR_CROSSFADE',
          reason: 'Safety net: grid-independent 4-bar crossfade',
        },
      }),
    });

    const res = await client.planForAdjacentTracks('a', 'b');

    expect(res.ok).toBe(true);
    expect(res.fallback?.rung).toBe('RUNG_FOUR_BAR_CROSSFADE');
    expect(res.notice).toContain('Fallback in use');
  });

  it('rejects an invalid adjacent pair and does not send it', async () => {
    let submitted = false;
    const client = createTransitionPlanClient({
      submit: async () => {
        submitted = true;
      },
    });

    const res = await client.planForAdjacentTracks('a', 'a');

    expect(res).toEqual({ ok: false, reason: 'invalid-adjacent-track-pair' });
    expect(submitted).toBe(false);
  });
});