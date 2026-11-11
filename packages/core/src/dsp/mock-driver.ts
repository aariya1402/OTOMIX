import type { DspEngineConfig } from '../config/transition-config';
import type { TransitionPlan } from '../transition/types';
import type { DspPort, AudioParamAutomation } from './port';

export interface ScheduledTransitionRecord {
  readonly plan: TransitionPlan;
  readonly automations: readonly AudioParamAutomation[];
  readonly scheduledAtBeat: number;
}

export class MockDspDriver implements DspPort {
  private config: DspEngineConfig | null = null;
  private started = false;
  private degradedMode = false;
  public bypass = true; 
  
  private readonly scheduled: ScheduledTransitionRecord[] = [];
  private readonly pendingAutomations: AudioParamAutomation[] = [];
  private readonly automationLog: AudioParamAutomation[] = [];
  
  private degradedStartGain = 1.0;
  private degradedEndGain = 0.0;

  initialize(config: DspEngineConfig): void {
    this.config = config;
  }

  start(): void { this.started = true; }
  stop(): void { this.started = false; }

  setDegraded(degraded: boolean): void { this.degradedMode = degraded; }
  isDegraded(): boolean { return this.degradedMode; }

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

  process(inputs: Float32Array[][], outputs: Float32Array[][], currentBeat: number): boolean {
    const output = outputs[0][0];
    const input = inputs[0][0];
    if (!output || !input) return true;

    if (this.degradedMode) {
      // RUNG_STANDARD_CROSSFADE (0 chop slices)
      const len = input.length;
      for (let i = 0; i < len; i++) {
        const t = i / Math.max(1, len - 1);
        const gain = this.degradedStartGain + (this.degradedEndGain - this.degradedStartGain) * t;
        output[i] = input[i] * gain;
      }
      this.degradedStartGain = this.degradedEndGain;
    } else {
      output.set(input);
    }
    return true;
  }

  getScheduledTransitions(): readonly ScheduledTransitionRecord[] { return this.scheduled; }
  getAutomationLog(): readonly AudioParamAutomation[] { return this.automationLog; }
  getPendingAutomations(): readonly AudioParamAutomation[] { return this.pendingAutomations; }
  isStarted(): boolean { return this.started; }
}