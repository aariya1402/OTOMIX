// OTOMIX §4.1 · Owner decision D14 (2026-11-12)
//
// Main-thread client for the isolated analysis engine.
// Validates requests and responses through the Engine API Contract.
// No direct Essentia imports.

import { Worker } from 'node:worker_threads';
import {
  validateAnalysisEngineRequest,
  validateAnalysisEngineResponse,
  type AnalysisEngineRequest,
  type AnalysisEngineResponse,
} from '@otomix/contracts';

export class EngineClient {
  constructor(private readonly workerPath: string | URL) {}

  /**
   * Runs an analysis request in the isolated worker.
   * Validates the request before sending and the response before returning.
   */
  public async runAnalysis(request: AnalysisEngineRequest): Promise<AnalysisEngineResponse> {
    // 1. Validate request boundary
    const reqValidation = validateAnalysisEngineRequest(request);
    if (!reqValidation.ok) {
      return { status: 'error', message: `Client pre-validation failed: ${reqValidation.message}` };
    }

    // 2. Spawn worker (terminate after use for strict isolation)
    return new Promise((resolve) => {
      const worker = new Worker(this.workerPath);

      let isDone = false;
      const finish = (response: AnalysisEngineResponse) => {
        if (isDone) return;
        isDone = true;
        worker.terminate(); // Ensure cleanup
        
        // 3. Validate response boundary
        const resValidation = validateAnalysisEngineResponse(response);
        if (!resValidation.ok) {
          resolve({ status: 'error', message: `Client post-validation failed: ${resValidation.message}` });
        } else {
          resolve(response);
        }
      };

      // Handle worker startup errors
      worker.on('error', (err) => {
        finish({ status: 'error', message: `Worker error: ${err.message}` });
      });

      // Handle response from worker
      worker.on('message', (msg: unknown) => {
        finish(msg as AnalysisEngineResponse);
      });

      // Send the request
      worker.postMessage(request);
    });
  }
}