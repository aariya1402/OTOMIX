// OTOMIX §2.5; §2.12 · Mother §1; Add. §3
//
// Degraded-mode controller: enters on POOL_EXHAUSTED or WORKER_FAILED,
// exits only on RECOVERED. Exposes core.degraded_mode.active gauge (0|1).

export type DegradedEvent = 'POOL_EXHAUSTED' | 'WORKER_FAILED' | 'RECOVERED';
export type DegradedReason = 'POOL_EXHAUSTED' | 'WORKER_FAILED';

export interface DegradedModeState {
  active: boolean;
  reason: DegradedReason | null;
}

export interface DegradedModeController {
  /** Enter degraded mode. Idempotent: second call with any reason is no-op. */
  enter(reason: DegradedReason): void;
  /** Exit degraded mode. Throws if called without preceding RECOVERED event. */
  exit(): void;
  /** Process a typed event. Preferred over direct enter/exit for event-driven use. */
  onEvent(event: DegradedEvent): void;
  /** Current active state. */
  isActive(): boolean;
  /** Gauge value for core.degraded_mode.active (0 | 1). */
  getGauge(): 0 | 1;
  /** Reason that triggered degraded mode, or null if not active. */
  getReason(): DegradedReason | null;
}

export interface CreateDegradedModeControllerOptions {
  /** Called when entering degraded mode (after state transition). */
  onEnter?: (reason: DegradedReason) => void;
  /** Called when exiting degraded mode (after state transition). */
  onExit?: () => void;
}

/** Pure reducer for testing and functional composition. */
export function degradedReducer(
  state: DegradedModeState,
  event: DegradedEvent,
): DegradedModeState {
  switch (event) {
    case 'POOL_EXHAUSTED':
    case 'WORKER_FAILED': {
      if (state.active) return state;
      return { active: true, reason: event };
    }
    case 'RECOVERED': {
      if (!state.active) return state;
      return { active: false, reason: null };
    }
  }
}

/** Factory creating a DegradedModeController with encapsulated state. */
export function createDegradedModeController(
  options: CreateDegradedModeControllerOptions = {},
): DegradedModeController {
  let state: DegradedModeState = { active: false, reason: null };
  const { onEnter, onExit } = options;

  function enter(reason: DegradedReason): void {
    const nextState = degradedReducer(state, reason);
    const wasInactive = !state.active && nextState.active;
    state = nextState;
    if (wasInactive && onEnter) onEnter(reason);
  }

  function exit(): void {
    // Enforced per Review Checkpoint: only onEvent('RECOVERED') may exit.
    throw new Error('Degraded mode exit requires RECOVERED event');
  }

  function onEvent(event: DegradedEvent): void {
    const nextState = degradedReducer(state, event);
    const wasInactive = !state.active && nextState.active;
    const wasActive = state.active && !nextState.active;
    state = nextState;
    if (wasInactive && onEnter) onEnter(state.reason!);
    if (wasActive && onExit) onExit();
  }

  function isActive(): boolean {
    return state.active;
  }

  function getGauge(): 0 | 1 {
    return state.active ? 1 : 0;
  }

  function getReason(): DegradedReason | null {
    return state.reason;
  }

  return { enter, exit, onEvent, isActive, getGauge, getReason };
}