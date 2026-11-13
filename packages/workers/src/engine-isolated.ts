// OTOMIX §4.1 · Owner decision D14 (2026-11-12)
//
// Isolated worker entry point for the Analysis Engine.
// This file is spawned via worker_threads.
// It receives an AnalysisEngineRequest, runs the mock engine (stand-in
// for Essentia/Librosa), and returns an AnalysisEngineResponse.
//
// Rule 26: pcm_buffer is a base64 string, sample_rate is Hz, length is
// sample count. No musical quantities in seconds appear here.

import { parentPort } from 'node:worker_threads';
import { validateAnalysisEngineRequest, type AnalysisEngineRequest } from '@otomix/contracts';

if (!parentPort) {
  throw new Error('engine-isolated.ts must be run as a worker thread.');
}

parentPort.on('message', (message: unknown) => {
  // The client sends the request object directly.
  const validation = validateAnalysisEngineRequest(message);
  if (!validation.ok) {
    parentPort!.postMessage({
      status: 'error',
      message: validation.message,
    });
    return;
  }

  const req = message as AnalysisEngineRequest;

  // Mock engine: convert base64 to bytes to prove we can handle the payload.
  const buffer = Buffer.from(req.pcm_buffer, 'base64');
  
  // In a real implementation, we would pass `buffer` to Essentia/Librosa.
  // Here, we return a static feature set to prove the pipeline works.
  // (The contract covers the transport; the actual extraction is task P05-T02+).
  const mockFeatures = {
    bpm: 120,
    key_temperley: 8,
    onset_rate: 4.5,
    // Echo back some metadata to prove data integrity
    received_length: req.length,
    received_channels: req.channels,
    received_bytes: buffer.length,
  };

  parentPort!.postMessage({
    status: 'success',
    features: mockFeatures,
  });
});