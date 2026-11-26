import { BUFFER_NORMAL, computeBufferSize } from '@otomix/core';
import type { ObserverFrameMessage, ObserverStateMessage } from './observer-bridge.js';

export function createObserverFrameHandler(
  postMessage: (message: ObserverStateMessage) => void
): (message: ObserverFrameMessage) => void {
  let bufferSize = BUFFER_NORMAL;

  return ({ type, frameTimeMs }) => {
    if (type !== 'frame' || !Number.isFinite(frameTimeMs) || frameTimeMs < 0) return;
    const result = computeBufferSize(bufferSize, frameTimeMs);
    bufferSize = result.bufferSize;
    postMessage({
      type: 'state',
      state: {
        bufferSize,
        frameTimeMs,
        starvation: result.starvation,
        degraded: bufferSize !== BUFFER_NORMAL,
      },
    });
  };
}

interface ObserverWorkerScope {
  onmessage: ((event: MessageEvent<ObserverFrameMessage>) => void) | null;
  postMessage(message: ObserverStateMessage): void;
}

const workerScope = globalThis as unknown as ObserverWorkerScope;
if (typeof document === 'undefined' && typeof workerScope.postMessage === 'function') {
  const handleFrame = createObserverFrameHandler((message) => workerScope.postMessage(message));
  workerScope.onmessage = (event) => handleFrame(event.data);
}
