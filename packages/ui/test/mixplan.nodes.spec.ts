// OTOMIX §4.9 · Transition Node Builder (P08-T04-S02-M04)
// Builds transition nodes dynamically as tracks are added to the queue.
// Rule 26: Dimensionless units only.

import { describe, it, expect } from 'vitest';
import { createTransitionNodeBuilder } from '../src/mixplan/nodes';
import { TransitionPlanResponse } from '../src/mixplan/client';

describe('P08-T04-S02-M04: Dynamic transition nodes', () => {
  describe('createTransitionNodeBuilder', () => {
    it('creates no nodes for a single track', () => {
      const builder = createTransitionNodeBuilder({
        getTrackFeatures: () => null,
        submitPlan: async () => null,
      });
      builder.addTrack('track-a');
      expect(builder.getNodeCount()).toBe(0);
      expect(builder.getAllNodes().length).toBe(0);
    });

    it('creates one node for two tracks', async () => {
      const builder = createTransitionNodeBuilder({
        getTrackFeatures: () => null,
        submitPlan: async () => null,
      });
      builder.addTrack('track-a');
      builder.addTrack('track-b');
      expect(builder.getNodeCount()).toBe(1);
      const nodes = builder.getAllNodes();
      expect(nodes[0].fromTrackId).toBe('track-a');
      expect(nodes[0].toTrackId).toBe('track-b');
      expect(nodes[0].status).toBe('pending');
    });

    it('creates two nodes for three tracks', async () => {
      const builder = createTransitionNodeBuilder({
        getTrackFeatures: () => null,
        submitPlan: async () => null,
      });
      builder.addTrack('track-a');
      builder.addTrack('track-b');
      builder.addTrack('track-c');
      expect(builder.getNodeCount()).toBe(2);
      const nodes = builder.getAllNodes();
      expect(nodes[0].fromTrackId).toBe('track-a');
      expect(nodes[0].toTrackId).toBe('track-b');
      expect(nodes[1].fromTrackId).toBe('track-b');
      expect(nodes[1].toTrackId).toBe('track-c');
    });

    it('processes nodes through the enrichment pipeline', async () => {
      const builder = createTransitionNodeBuilder({
        getTrackFeatures: () => null,
        submitPlan: async () => ({
          rung: 'RUNG_NONE',
          reason: '',
          tInSeconds: 100,
          tOutSeconds: 200,
          inBeatIndex: 1,
          outBeatIndex: 1,
          alignToSeconds: 200,
          mappedBpm: 120,
          windowBeats: 64,
        }),
      });
      builder.addTrack('track-a');
      builder.addTrack('track-b');
      builder.addTrack('track-c');
      await builder.processAllNodes();
      const nodes = builder.getAllNodes();
      expect(nodes[0].status).toBe('complete');
      expect(nodes[1].status).toBe('complete');
    });

    it('gets nodes for a specific track', () => {
      const builder = createTransitionNodeBuilder({
        getTrackFeatures: () => null,
        submitPlan: async () => null,
      });
      builder.addTrack('track-a');
      builder.addTrack('track-b');
      builder.addTrack('track-c');

      const nodesForA = builder.getNode('track-a');
      expect(nodesForA.length).toBe(1);
      expect(nodesForA[0].fromTrackId).toBe('track-a');

      const nodesForB = builder.getNode('track-b');
      expect(nodesForB.length).toBe(2);
      expect(nodesForB[0].fromTrackId).toBe('track-a');
      expect(nodesForB[1].fromTrackId).toBe('track-b');
      expect(nodesForB[1].toTrackId).toBe('track-c');
    });

    it('handles empty queue', () => {
      const builder = createTransitionNodeBuilder({
        getTrackFeatures: () => null,
        submitPlan: async () => null,
      });
      builder.addTrack('track-a');
      builder.addTrack('track-b');
      builder.addTrack('track-c');
      builder.addTrack('track-d');
      builder.addTrack('track-d');
      expect(builder.getNodeCount()).toBe(3);
      const nodes = builder.getAllNodes();
      expect(nodes[0].fromTrackId).toBe('track-a');
      expect(nodes[0].toTrackId).toBe('track-b');
      expect(nodes[1].fromTrackId).toBe('track-b');
      expect(nodes[1].toTrackId).toBe('track-c');
      expect(nodes[2].fromTrackId).toBe('track-c');
      expect(nodes[2].toTrackId).toBe('track-d');
    });

    it('reorders tracks and rebuilds only affected adjacent nodes', async () => {
      const builder = createTransitionNodeBuilder({
        getTrackFeatures: () => null,
        submitPlan: async () => ({
          rung: 'RUNG_NONE',
          reason: '',
          tInSeconds: 100,
          tOutSeconds: 200,
          inBeatIndex: 1,
          outBeatIndex: 1,
          alignToSeconds: 200,
          mappedBpm: 120,
          windowBeats: 64,
        }),
      });
      builder.addTrack('track-a');
      builder.addTrack('track-b');
      builder.addTrack('track-c');
      builder.addTrack('track-d');
      await builder.processAllNodes();

      const oldNodes = builder.getAllNodes();
      builder.setTracks(['track-b', 'track-a', 'track-c', 'track-d']);

      const nodes = builder.getAllNodes();
      expect(nodes.map(({ fromTrackId, toTrackId }) => [fromTrackId, toTrackId])).toEqual([
        ['track-b', 'track-a'],
        ['track-a', 'track-c'],
        ['track-c', 'track-d'],
      ]);
      expect(nodes[0]).not.toBe(oldNodes[0]);
      expect(nodes[1]).not.toBe(oldNodes[1]);
      expect(nodes[2]).toBe(oldNodes[2]);
      expect(nodes[0].status).toBe('pending');
      expect(nodes[1].status).toBe('pending');
      expect(nodes[2].status).toBe('complete');
    });
  });
});
