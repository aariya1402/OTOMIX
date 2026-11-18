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
});