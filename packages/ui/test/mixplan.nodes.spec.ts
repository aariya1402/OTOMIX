import { describe, expect, it } from 'vitest';
import { buildTransitionNodes } from '../src/mixplan/nodes';

describe('mixplan.nodes', () => {
  it('builds a node for each adjacent pair as the queue grows', () => {
    const oneTrack = buildTransitionNodes(['a']);
    const twoTracks = buildTransitionNodes(['a', 'b'], oneTrack);
    const threeTracks = buildTransitionNodes(['a', 'b', 'c'], twoTracks);

    expect(oneTrack).toHaveLength(0);
    expect(twoTracks).toMatchObject([{ fromTrackId: 'a', toTrackId: 'b' }]);
    expect(threeTracks).toMatchObject([
      { fromTrackId: 'a', toTrackId: 'b' },
      { fromTrackId: 'b', toTrackId: 'c' },
    ]);
  });

  it('rebuilds changed pairs on reorder while retaining unaffected nodes', () => {
    const original = buildTransitionNodes(['a', 'b', 'c', 'd', 'e']);
    const unaffected = original.find((node) => node.fromTrackId === 'd');
    const reordered = buildTransitionNodes(
      ['a', 'c', 'b', 'd', 'e'],
      original
    );

    expect(reordered.map(({ fromTrackId, toTrackId }) => [fromTrackId, toTrackId]))
      .toEqual([
        ['a', 'c'],
        ['c', 'b'],
        ['b', 'd'],
        ['d', 'e'],
      ]);
    expect(reordered[3]).toBe(unaffected);
    expect(reordered.slice(0, 3).every((node) => original.includes(node))).toBe(false);
  });

  it('removes nodes for pairs no longer present and avoids duplicate nodes', () => {
    const original = buildTransitionNodes(['a', 'b', 'c', 'd']);
    const updated = buildTransitionNodes(['a', 'b', 'd'], original);
    const duplicatedInput = buildTransitionNodes(['a', 'b', 'a', 'b']);

    expect(updated.map((node) => node.id)).toEqual([
      original[0]!.id,
      'transition:1:b:1:d',
    ]);
    expect(updated[0]).toBe(original[0]);
    expect(duplicatedInput.map(({ fromTrackId, toTrackId }) => [fromTrackId, toTrackId]))
      .toEqual([
        ['a', 'b'],
        ['b', 'a'],
      ]);
  });
});
