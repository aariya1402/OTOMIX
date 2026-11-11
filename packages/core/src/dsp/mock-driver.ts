import type { DspEngineConfig } from '../config/transition-config';
import type { TransitionPlan } from '../transition/types';
import type { DspPort, AudioParamAutomation } from './port';

export interface ScheduledTransitionRecord {
  readonly plan: TransitionPlan;
  readonly automations: readonly AudioParamAutomation[];
  readonly scheduledAtBeat: number;
}

/**
 * A headless mock implementation of DspPort for signal-flow tests.
 * Guarantees no AudioContext usage.
 * Rule 23: Zero allocations in the process() loop.
 */
export class MockDspDriver implements DspPort {
  private config: DspEngineConfig | null = null;
  private started = false;
  public bypass = true; 
  
  private readonly scheduled: ScheduledTransitionRecord[] = [];
  private readonly pendingAutomations: AudioParamAutomation[] = [];
  private readonly automationLog: AudioParamAutomation[] = [];

  initialize(config: DspEngineConfig): void {
    this.config = config;
  }

  start(): void {
    this.started = true;
  }

  stop(): void {
    this.started = false;
  }

  scheduleTransition(plan: TransitionPlan, automations: readonly AudioParamAutomation[]): void {
    this.scheduled.push({ plan, automations, scheduledAtBeat: plan.inBeatIndex });
    for (let i = 0; i < automations.length; i++) {
      this.pendingAutomations.push(automations[i]);
    }
  }

  flush(): void {
    for (let i = 0; i < this.pendingAutomations.length; i++) {
      this.automationLog.push(this.pendingAutomations[i]);
    }
    this.pendingAutomations.length = 0;
  }

  /**
   * Headless signal-flow process loop.
   * Rule 23: uses output.set(input) for zero-allocation passthrough.
   */
  process(inputs: Float32Array[][], outputs: Float32Array[][], currentBeat: number): boolean {
    const output = outputs[0][0];
    const input = inputs[0][0];
    
    if (output && input) {
      output.set(input);
    }

    return true;
  }

  // --- Test introspection methods ---
  getScheduledTransitions(): readonly ScheduledTransitionRecord[] { return this.scheduled; }
  getAutomationLog(): readonly AudioParamAutomation[] { return this.automationLog; }
  getPendingAutomations(): readonly AudioParamAutomation[] { return this.pendingAutomations; }
  isStarted(): boolean { return this.started; }
}