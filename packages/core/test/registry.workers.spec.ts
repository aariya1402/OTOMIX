import { describe, it, expect, beforeEach } from 'vitest';
import { workerRegistry, WorkerMetadata } from '../src/registry/worker-registry';

const mockWorker1: WorkerMetadata = {
  id: 'essentia-worker',
  type: 'wasm',
  capabilities: ['bpm', 'key', 'energy'],
  version: '1.0.0',
  path: '/workers/essentia.wasm',
};

const mockWorker2: WorkerMetadata = {
  id: 'spotify-api',
  type: 'api',
  capabilities: ['artist', 'album', 'release_date'],
  version: '2.1.0',
  endpoint: 'https://api.spotify.com/v1',
};

describe('WorkerRegistry', () => {
  beforeEach(() => {
    workerRegistry.clear();
  });

  it('T1: register two workers -> stored successfully', () => {
    expect(workerRegistry.register(mockWorker1)).toBe(true);
    expect(workerRegistry.register(mockWorker2)).toBe(true);
    expect(workerRegistry.register(mockWorker1)).toBe(false); // duplicate
  });

  it('T2: list() returns all registered workers', () => {
    workerRegistry.register(mockWorker1);
    workerRegistry.register(mockWorker2);
    const list = workerRegistry.list();
    expect(list.length).toBe(2);
    expect(list).toContainEqual(mockWorker1);
    expect(list).toContainEqual(mockWorker2);
  });

  it('T3: get(id) returns exact metadata', () => {
    workerRegistry.register(mockWorker1);
    expect(workerRegistry.get('essentia-worker')).toEqual(mockWorker1);
  });

  it('T4: get() on non-existent ID returns undefined', () => {
    expect(workerRegistry.get('non-existent')).toBeUndefined();
  });
});