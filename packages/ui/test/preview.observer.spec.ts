// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MockDspDriver } from '@otomix/core';
import { MixPlanApp } from '../src/components/MixPlanApp';
import { createObserverFrameHandler } from '../src/preview/observer.worker';
import {
  createPreviewObserverBridge,
  type ObserverFrameMessage,
  type ObserverStateMessage,
  type PreviewObserverTarget,
  type PreviewObserverWorker,
} from '../src/preview/observer-bridge';
import { createPreviewController } from '../src/preview/controller';
import { emptyLibraryState } from '../src/state/library';
import { emptyQueueState } from '../src/state/queue';

class MockObserverWorker implements PreviewObserverWorker {
  private readonly listeners = new Set<(event: MessageEvent<ObserverStateMessage>) => void>();
  private readonly handleFrame = createObserverFrameHandler((message) => {
    const event = new MessageEvent<ObserverStateMessage>('message', { data: message });
    for (const listener of this.listeners) listener(event);
  });
  public terminated = false;

  postMessage(message: ObserverFrameMessage): void {
    this.handleFrame(message);
  }

  addEventListener(
    _type: 'message',
    listener: (event: MessageEvent<ObserverStateMessage>) => void
  ): void {
    this.listeners.add(listener);
  }

  removeEventListener(
    _type: 'message',
    listener: (event: MessageEvent<ObserverStateMessage>) => void
  ): void {
    this.listeners.delete(listener);
  }

  terminate(): void {
    this.terminated = true;
  }
}

class MockPreviewDriver extends MockDspDriver implements PreviewObserverTarget {
  public bufferSize = 2048;
  public readonly bufferChanges: number[] = [];

  setBufferSize(bufferSize: number): void {
    this.bufferSize = bufferSize;
    this.bufferChanges.push(bufferSize);
  }
}

describe('preview Runtime Observer bridge', () => {
  it('runs frame measurement in the observer worker, changes preview buffer, and exposes degraded state', () => {
    const driver = new MockPreviewDriver();
    const worker = new MockObserverWorker();
    const bridge = createPreviewObserverBridge(driver, worker);
    const controller = createPreviewController(driver, undefined, bridge);
    const onObserverState = vi.fn();
    controller.subscribeObserver(onObserverState);

    controller.reportFrameTime(12);

    expect(driver.bufferSize).toBe(4096);
    expect(driver.bufferChanges).toEqual([4096]);
    expect(driver.isDegraded()).toBe(true);
    expect(controller.getObserverState()).toEqual({
      bufferSize: 4096,
      frameTimeMs: 12,
      starvation: true,
      degraded: true,
    });
    expect(onObserverState).toHaveBeenCalledWith(controller.getObserverState());
  });

  it('keeps degraded mode latched after a later frame returns below the threshold', () => {
    const driver = new MockPreviewDriver();
    const bridge = createPreviewObserverBridge(driver, new MockObserverWorker());

    bridge.reportFrameTime(12);
    bridge.reportFrameTime(8);

    expect(bridge.getState()).toMatchObject({
      bufferSize: 4096,
      starvation: false,
      degraded: true,
    });
    expect(driver.isDegraded()).toBe(true);
  });

  it('renders starvation and degraded-mode status in the preview UI', () => {
    const driver = new MockPreviewDriver();
    const bridge = createPreviewObserverBridge(driver, new MockObserverWorker());
    const controller = createPreviewController(driver, undefined, bridge);

    render(
      React.createElement(MixPlanApp, {
        libraryState: emptyLibraryState(),
        queueState: emptyQueueState(),
        onAddToQueue: vi.fn(),
        onRemoveFromQueue: vi.fn(),
        onReorderQueue: vi.fn(),
        onSetStarterTrack: vi.fn(),
        onTrackSelect: vi.fn(),
        previewController: controller,
      })
    );

    act(() => controller.reportFrameTime(12));

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Audio thread starvation detected');
    expect(status.textContent).toContain('degraded mode');
    expect(status.getAttribute('data-buffer-size')).toBe('4096');
  });

  it('ignores malformed and negative frame measurements and detaches on dispose', () => {
    const driver = new MockPreviewDriver();
    const worker = new MockObserverWorker();
    const bridge = createPreviewObserverBridge(driver, worker);

    bridge.reportFrameTime(-1);
    bridge.reportFrameTime(Number.NaN);
    bridge.dispose();
    bridge.reportFrameTime(12);

    expect(bridge.getState().degraded).toBe(false);
    expect(driver.bufferChanges).toEqual([]);
    expect(worker.terminated).toBe(true);
  });
});
