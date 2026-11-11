import type { DspEngineConfig } from '../config/transition-config';
import type { TransitionPlan } from '../transition/types';

export type AutomationCurve = 'linear' | 'exponential' | 'step';

export interface AudioParamAutomation {
  readonly paramId: string;
  readonly targetValue: number;
  readonly time: number; // beats
  readonly curve: AutomationCurve;
}

export interface DspPort {
  initialize(config: DspEngineConfig): void;
  start(): void;
  stop(): void;
  scheduleTransition(plan: TransitionPlan, automations: readonly AudioParamAutomation[]): void;
  flush(): void;
  setDegraded(degraded: boolean): void;
  isDegraded(): boolean;
}