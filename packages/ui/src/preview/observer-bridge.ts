import { BUFFER_NORMAL, BUFFER_DEGRADED } from '@otomix/core';
import type { DspPort } from '@otomix/core';

export interface PreviewObserverState {
  readonly bufferSize: number;
  readonly frameTimeMs: number | null;
  readonly starvation: boolean;
  readonly degraded: boolean;
}

export interface ObserverFrameMessage {
  readonly type: 'frame';
  readonly frameTimeMs: number;
}

export interface ObserverStateMessage {
  readonly type: 'state';
  readonly state: PreviewObserverState;
}

export type ObserverWorkerMessage = ObserverFrameMessage | ObserverStateMessage;

export interface PreviewObserverWorker {
  postMessage(message: ObserverFrameMessage): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<ObserverStateMessage>) => void
  ): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<ObserverStateMessage>) => void
  ): void;
  terminate?(): void;
}

export function createPreviewObserverWorker(scriptUrl: string | URL): PreviewObserverWorker {
  if (typeof Worker === 'undefined') {
    throw new Error('Preview Runtime Observer requires a browser Worker');
  }
  return new Worker(scriptUrl, { type: 'module' });
}

export interface PreviewObserverTarget extends Pick<DspPort, 'setDegraded'> {
  setBufferSize(bufferSize: number): void;
}

export interface PreviewObserverBridge {
  reportFrameTime(frameTimeMs: number): void;
  getState(): PreviewObserverState;
  subscribe(listener: (state: PreviewObserverState) => void): () => void;
  dispose(): void;
}

const initialState: PreviewObserverState = {
  bufferSize: BUFFER_NORMAL,
  frameTimeMs: null,
  starvation: false,
  degraded: false,
};

function isObserverStateMessage(value: unknown): value is ObserverStateMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ObserverStateMessage>;
  const state = message.state;
  return (
    message.type === 'state' &&
    Boolean(state) &&
    Number.isFinite(state!.bufferSize) &&
    (state!.frameTimeMs === null || Number.isFinite(state!.frameTimeMs)) &&
    typeof state!.starvation === 'boolean' &&
    typeof state!.degraded === 'boolean' &&
    (state!.bufferSize === BUFFER_NORMAL || state!.bufferSize === BUFFER_DEGRADED) &&
    state!.degraded === (state!.bufferSize === BUFFER_DEGRADED)
  );
}

export function createPreviewObserverBridge(
  target: PreviewObserverTarget,
  worker: PreviewObserverWorker
): PreviewObserverBridge {
  let state = initialState;
  let disposed = false;
  const listeners = new Set<(nextState: PreviewObserverState) => void>();

  const handleMessage = (event: MessageEvent<ObserverStateMessage>): void => {
    if (disposed || !isObserverStateMessage(event.data)) return;
    const nextState = event.data.state;
    const bufferChanged = nextState.bufferSize !== state.bufferSize;
    const degradedChanged = nextState.degraded !== state.degraded;
    state = nextState;

    if (bufferChanged) target.setBufferSize(nextState.bufferSize);
    if (degradedChanged) target.setDegraded(nextState.degraded);
    for (const listener of listeners) listener(state);
  };

  worker.addEventListener('message', handleMessage);

  return {
    reportFrameTime(frameTimeMs) {
      if (disposed || !Number.isFinite(frameTimeMs) || frameTimeMs < 0) return;
      worker.postMessage({ type: 'frame', frameTimeMs });
    },
    getState() {
      return state;
    },
    subscribe(listener) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      worker.removeEventListener('message', handleMessage);
      worker.terminate?.();
    },
  };
}
