// OTOMIX §2.5; §2.12 · Mother §1; Add. §3
import { describe, it, expect, vi } from 'vitest';
import {
  createDegradedModeController,
  degradedReducer,
} from '../src/resilience/degraded';

describe('degradedReducer (pure)', () => {
  it('POOL_EXHAUSTED -> active=true, reason=POOL_EXHAUSTED', () => {
    const s0 = { active: false, reason: null as null };
    const s1 = degradedReducer(s0, 'POOL_EXHAUSTED');
    expect(s1).toEqual({ active: true, reason: 'POOL_EXHAUSTED' });
  });

  it('WORKER_FAILED -> active=true, reason=WORKER_FAILED', () => {
    const s0 = { active: false, reason: null as null };
    const s1 = degradedReducer(s0, 'WORKER_FAILED');
    expect(s1).toEqual({ active: true, reason: 'WORKER_FAILED' });
  });

  it('RECOVERED when active -> active=false, reason=null', () => {
    const s0 = { active: true, reason: 'POOL_EXHAUSTED' as const };
    const s1 = degradedReducer(s0, 'RECOVERED');
    expect(s1).toEqual({ active: false, reason: null });
  });

  it('enter twice keeps first reason (idempotent)', () => {
    let s: { active: boolean; reason: 'POOL_EXHAUSTED' | 'WORKER_FAILED' | null } = {
      active: false,
      reason: null,
    };
    s = degradedReducer(s, 'POOL_EXHAUSTED');
    s = degradedReducer(s, 'WORKER_FAILED');
    expect(s.reason).toBe('POOL_EXHAUSTED');
  });

  it('RECOVERED when inactive is no-op', () => {
    const s0 = { active: false, reason: null as null };
    const s1 = degradedReducer(s0, 'RECOVERED');
    expect(s1).toEqual(s0);
  });
});

describe('createDegradedModeController', () => {
  it('POOL_EXHAUSTED -> active=true, gauge=1', () => {
    const ctrl = createDegradedModeController();
    ctrl.onEvent('POOL_EXHAUSTED');
    expect(ctrl.isActive()).toBe(true);
    expect(ctrl.getGauge()).toBe(1);
    expect(ctrl.getReason()).toBe('POOL_EXHAUSTED');
  });

  it('WORKER_FAILED -> active=true, gauge=1', () => {
    const ctrl = createDegradedModeController();
    ctrl.onEvent('WORKER_FAILED');
    expect(ctrl.isActive()).toBe(true);
    expect(ctrl.getGauge()).toBe(1);
    expect(ctrl.getReason()).toBe('WORKER_FAILED');
  });

  it('RECOVERED after POOL_EXHAUSTED -> active=false, gauge=0', () => {
    const ctrl = createDegradedModeController();
    ctrl.onEvent('POOL_EXHAUSTED');
    ctrl.onEvent('RECOVERED');
    expect(ctrl.isActive()).toBe(false);
    expect(ctrl.getGauge()).toBe(0);
    expect(ctrl.getReason()).toBeNull();
  });

  it('exit() without RECOVERED throws (Review Checkpoint enforcement)', () => {
    const ctrl = createDegradedModeController();
    ctrl.onEvent('POOL_EXHAUSTED');
    expect(() => ctrl.exit()).toThrow('Degraded mode exit requires RECOVERED event');
  });

  it('exit() when not active throws', () => {
    const ctrl = createDegradedModeController();
    expect(() => ctrl.exit()).toThrow('Degraded mode exit requires RECOVERED event');
  });

  it('onEnter callback fires once on first enter', () => {
    const onEnter = vi.fn();
    const ctrl = createDegradedModeController({ onEnter });
    ctrl.onEvent('POOL_EXHAUSTED');
    ctrl.onEvent('WORKER_FAILED');
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledWith('POOL_EXHAUSTED');
  });

  it('onExit callback fires on RECOVERED', () => {
    const onExit = vi.fn();
    const ctrl = createDegradedModeController({ onExit });
    ctrl.onEvent('POOL_EXHAUSTED');
    ctrl.onEvent('RECOVERED');
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('enter(reason) method works same as onEvent', () => {
    const ctrl = createDegradedModeController();
    ctrl.enter('WORKER_FAILED');
    expect(ctrl.isActive()).toBe(true);
    expect(ctrl.getReason()).toBe('WORKER_FAILED');
  });
});