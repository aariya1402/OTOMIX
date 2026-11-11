import type { DspEngineConfig } from '../config/transition-config';
import type { TransitionPlan } from '../transition/types';

/**
 * Curve type mapping to Web Audio AudioParam ramp methods.
 */
export type AutomationCurve = 'linear' | 'exponential' | 'step';

/**
 * A single automation event scheduled at a beat time.
 * Rule 26: `time` is in beats (fractional/quanta allowed), NOT seconds.
 */
export interface AudioParamAutomation {
  readonly paramId: string;
  readonly targetValue: number;
  readonly time: number; // beats
  readonly curve: AutomationCurve;
}

/**
 * The port through which the planner commands the DSP engine.
 * Implementations are constructed on the main thread and consumed by the
 * AudioWorklet on the real-time thread.
 */
export interface DspPort {
  initialize(config: DspEngineConfig): void;
  start(): void;
  stop(): void;
  scheduleTransition(plan: TransitionPlan, automations: readonly AudioParamAutomation[]): void;
  flush(): void;
}