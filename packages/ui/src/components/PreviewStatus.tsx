import React from 'react';
import type { PreviewObserverState } from '../preview/observer-bridge';

export interface PreviewStatusProps {
  readonly state: PreviewObserverState;
}

export function PreviewStatus({ state }: PreviewStatusProps): React.ReactElement | null {
  if (!state.starvation && !state.degraded) return null;

  return (
    <div
      className="preview-status preview-status-degraded"
      data-testid="preview-status"
      data-buffer-size={state.bufferSize}
      role="status"
      aria-live="polite"
    >
      {state.starvation
        ? 'Audio thread starvation detected; preview is in degraded mode.'
        : 'Preview is running in degraded mode.'}{' '}
      Preview buffer: {state.bufferSize} samples.
    </div>
  );
}
