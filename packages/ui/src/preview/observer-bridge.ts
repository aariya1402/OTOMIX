import { computeBufferSize } from '@otomix/core';

export interface PreviewObserverState {
  readonly bufferSize: number;
  readonly degraded: boolean;
  readonly starvation: boolean;
}

export function attachPreviewObserver(
  currentBufferSize = 2048,
) {
  let state: PreviewObserverState = {
    bufferSize: currentBufferSize,
    degraded: currentBufferSize >= 4096,
    starvation: false,
  };

  return {
    observe(frameTimeMs: number): PreviewObserverState {
      const result = computeBufferSize(state.bufferSize, frameTimeMs);
      state = {
        bufferSize: result.bufferSize,
        degraded: result.starvation,
        starvation: result.starvation,
      };
      return state;
    },
    getState(): PreviewObserverState {
      return state;
    },
  };
}
