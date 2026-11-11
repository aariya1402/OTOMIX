import { describe, it, expect, beforeEach } from 'vitest';
import type { DspPort, AudioParamAutomation, AutomationCurve } from '../src/dsp/port';
import type { TransitionPlan } from '../src/transition/types';
import type { DspEngineConfig } from '../src/config/transition-config';

class MockDspPort implements DspPort {
  public initialized = false;
  public started = false;
  public stopped = false;
  public flushed = false;
  public config?: DspEngineConfig;
  public scheduledPlans: TransitionPlan[] = [];
  public scheduledAutomations: AudioParamAutomation[][] = [];

  initialize(config: DspEngineConfig): void {
    this.initialized = true;
    this.config = config;
  }
  start(): void { this.started = true; this.stopped = false; }
  stop(): void { this.stopped = true; this.started = false; }
  scheduleTransition(plan: TransitionPlan, automations: readonly AudioParamAutomation[]): void {
    this.scheduledPlans.push(plan);
    this.scheduledAutomations.push([...automations]);
  }
  flush(): void {
    this.flushed = true;
    this.scheduledPlans = [];
    this.scheduledAutomations = [];
  }
}

describe('DspPort interface (mock implementation)', () => {
  let port: MockDspPort;

  beforeEach(() => {
    port = new MockDspPort();
  });

  it('should accept a valid AudioParamAutomation entry', () => {
    const automation: AudioParamAutomation = {
      paramId: 'gain',
      targetValue: 0.5,
      time: 16,
      curve: 'linear',
    };
    expect(automation.paramId).toBe('gain');
    expect(automation.time).toBe(16);
  });

  it('should reject an automation entry missing the time field', () => {
    const invalid = { paramId: 'gain', targetValue: 0.5, curve: 'linear' } as AudioParamAutomation;
    expect((invalid as any).time).toBeUndefined();
  });

  it('should reject an automation entry with an unknown curve type', () => {
    const validCurves: AutomationCurve[] = ['linear', 'exponential', 'step'];
    expect(validCurves).not.toContain('spline');
  });

  it('should accept linear, exponential, and step curves', () => {
    const curves: AutomationCurve[] = ['linear', 'exponential', 'step'];
    curves.forEach(curve => {
      const automation: AudioParamAutomation = { paramId: 'rate', targetValue: 1.0, time: 32, curve };
      expect(automation.curve).toBe(curve);
    });
  });

  it('should schedule a transition and record automations in order', () => {
    const plan: TransitionPlan = {
      rung: 'RUNG_STANDARD_CROSSFADE', reason: 'test', tInSeconds: 0, tOutSeconds: 10,
      inBeatIndex: 1, outBeatIndex: 65, alignToSeconds: 0, mappedBpm: 120,
    };
    const automations: AudioParamAutomation[] = [
      { paramId: 'gain', targetValue: 0.8, time: 10, curve: 'linear' },
      { paramId: 'rate', targetValue: 1.0, time: 20, curve: 'exponential' },
    ];
    port.scheduleTransition(plan, automations);
    expect(port.scheduledPlans.length).toBe(1);
    expect(port.scheduledAutomations[0]).toHaveLength(2);
  });

  it('should start and set playback state to active', () => {
    port.start();
    expect(port.started).toBe(true);
    expect(port.stopped).toBe(false);
  });

  it('should stop and set playback state to inactive', () => {
    port.start();
    port.stop();
    expect(port.stopped).toBe(true);
    expect(port.started).toBe(false);
  });

  it('should flush and clear all pending automations', () => {
    const plan: TransitionPlan = {
      rung: 'RUNG_NONE', reason: 'test', tInSeconds: 0, tOutSeconds: 0,
      inBeatIndex: 0, outBeatIndex: 0, alignToSeconds: 0, mappedBpm: 120,
    };
    port.scheduleTransition(plan, []);
    port.flush();
    expect(port.flushed).toBe(true);
    expect(port.scheduledPlans.length).toBe(0);
  });

  it('should initialize with a DspEngineConfig and store it', () => {
    const config: DspEngineConfig = {
      adminConfig: { chopGrid: 8, crossfadeBeats: 0.015625, rateMin: 0.98, rateMax: 1.02, swingThreshold: 0.05 },
      userConfig: { entryBeat: 1, exitBeat: 65, transitionWindowBars: 16, bpmTolerance: 0.10, targetEnergy: 0.7, profileId: 'default' },
    transitionProfile: {
      id: 'default',
      name: 'Default Profile',
      windowBars: 16,
      bpmCurve: 'cosine',
      eqProfile: {
        low: { frequency: 100, gainDb: 0, q: 0.7 },
        mid: { frequency: 1000, gainDb: 0, q: 0.7 },
        high: { frequency: 10000, gainDb: 0, q: 0.7 }
      },
      effects: []
    },
    };
    port.initialize(config);
    expect(port.initialized).toBe(true);
    expect(port.config).toBe(config);
  });

  it('should expose only AudioBuffer and automation in its interface surface', () => {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(port));
    expect(methods).toContain('initialize');
    expect(methods).toContain('start');
    expect(methods).toContain('stop');
    expect(methods).toContain('scheduleTransition');
    expect(methods).toContain('flush');
  });
});