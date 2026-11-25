// P06-T07-S01-M01
// DSP parameter store. In-memory implementation for M01; Redis/DB
// implementations come in later tasks.

import type { DspParameters } from '../config/dsp-params.js';

export interface DspParametersStore {
  get(): Promise<DspParameters | null>;
  set(params: DspParameters): Promise<void>;
}

export function createInMemoryDspParametersStore(
  initial: DspParameters | null = null
): DspParametersStore {
  let current: DspParameters | null = initial;
  return {
    get(): Promise<DspParameters | null> {
      return Promise.resolve(current);
    },
    set(params: DspParameters): Promise<void> {
      current = { ...params };
      return Promise.resolve();
    },
  };
}
