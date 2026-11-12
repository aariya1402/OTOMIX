import { describe, it, expect, afterEach } from 'vitest';
import { EngineClient } from '../src/engine-client';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve the worker path relative to the test file. 
// Node 24 supports loading .ts files natively via type stripping.
const workerPath = path.resolve(__dirname, '../../workers/src/engine-isolated.ts');

describe('Engine API Isolation', () => {
  it('T1: successfully runs analysis in an isolated worker', async () => {
    const client = new EngineClient(workerPath);
    
    const request = {
      pcm_buffer: 'AAAAAA==', // 4 bytes of zeros
      sample_rate: 44100,
      channels: 2,
      length: 1024,
    };

    const response = await client.runAnalysis(request);
    
    expect(response.status).toBe('success');
    if (response.status === 'success') {
      expect(response.features).toHaveProperty('bpm', 120);
      expect(response.features).toHaveProperty('key_temperley', 8);
      // Verify the worker actually decoded the base64 payload
      expect(response.features).toHaveProperty('received_bytes', 4);
      expect(response.features).toHaveProperty('received_channels', 2);
    }
  }, 10000); // 10s timeout for worker spinup

  it('T2: rejects invalid request at the client boundary', async () => {
    const client = new EngineClient(workerPath);
    
    const badRequest = {
      // Missing pcm_buffer
      sample_rate: 44100,
      channels: 2,
      length: 1024,
    } as any;

    const response = await client.runAnalysis(badRequest);
    
    expect(response.status).toBe('error');
    if (response.status === 'error') {
      expect(response.message).toContain('Client pre-validation failed');
    }
  });
});